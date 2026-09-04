// A Stripe-shaped PSP: JSON over HTTPS, string statuses, an idempotency header, and
// 3-D Secure 2 run as a challenge inside an iframe.
//
// Everything specific to that dialect is in this file. Two pieces used to live elsewhere
// and are worth pointing out, because moving them here is the whole point of the plugin
// contract:
//
//   * building the `CReq` and posting it to the ACS used to be a React component
//   * the rule "transStatus Y means approved" used to be a line in that component
//
// Both are protocol details of *this* integration. A bank doing 3-D Secure 1 with a
// `PaReq` reaches the identical checkout UI without a single branch in it.

import { createHttpClient, HttpError, type ApiErrorPayload, type HttpClient } from '@pg/core/http'
import type {
  ActionEvidence,
  CallOptions,
  CreateIntentInput,
  PaymentAction,
  PaymentError,
  PaymentIntent,
  PaymentInstrument,
  PaymentProvider,
  PaymentProviderInstance,
  PaymentResult,
  PaymentStatus,
  ProviderCapabilities,
  ProviderContext,
} from '@pg/core'

export interface PspConfig {
  /** Root of the PSP API, e.g. `/api` under the app's base path. */
  readonly baseUrl: string
  /** Origin of the access control server that renders the challenge. */
  readonly acsOrigin: string
}

interface PaymentIntentDto {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  nextAction?: {
    type: 'redirect_to_url'
    three_d_secure: { challengeId: string; url: string; status: string }
  } | null
  error?: { code?: string; message: string } | null
}

export const PROVIDER_ID = 'psp'

const capabilities: ProviderCapabilities = {
  instruments: ['card'],
  actions: ['redirect'],
  surfaces: ['iframe', 'top'],
  authentication: ['none', '3ds2'],
  session: 'lazy',
  cancel: true,
  // Some authorizations come back later. The engine keeps asking until the payment is
  // final, because nothing here pushes.
  poll: true,
  idempotency: 'header',
}

const normalizeCardNumber = (value: string): string => value.replace(/\D/g, '')

const base64url = (value: object): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const toPaymentError = (cause: unknown, fallback: string): PaymentError => {
  if (cause instanceof HttpError) {
    const payload: ApiErrorPayload = cause.payload
    return { code: payload.code ?? payload.type, message: payload.message, detail: { ...payload } }
  }
  return { message: cause instanceof Error ? cause.message : fallback }
}

export const createPspProvider = (
  ctx: ProviderContext<PspConfig>,
  http: HttpClient = createHttpClient({ baseUrl: ctx.config.baseUrl, fetch: ctx.fetch }),
): PaymentProviderInstance => {
  const toIntent = (dto: PaymentIntentDto): PaymentIntent => ({
    id: dto.id,
    amount: dto.amount,
    currency: dto.currency,
    status: dto.status,
    providerId: PROVIDER_ID,
  })

  /**
   * The challenge, expressed as an action the engine can run without knowing what a
   * challenge is. `surface: 'iframe'` is only a preference - the host may run the very
   * same action in the top window, and `returnUrlField` is what makes that work.
   */
  const toChallengeAction = (challengeId: string): PaymentAction => ({
    id: challengeId,
    kind: 'redirect',
    purpose: 'authenticate',
    surface: 'iframe',
    url: `${ctx.config.acsOrigin}/challenge/${challengeId}`,
    method: 'POST',
    fields: {
      creq: base64url({
        threeDSServerTransID: ctx.uuid(),
        acsTransID: ctx.uuid(),
        challengeWindowSize: '05',
        messageType: 'CReq',
        messageVersion: '2.2.0',
      }),
    },
    returnUrlField: 'termUrl',
    completion: {
      via: 'post_message',
      origin: ctx.config.acsOrigin,
      type: '3ds-cres',
      // The ACS speaks 3-D Secure, not our vocabulary: it echoes the challenge id.
      correlationField: 'challengeId',
    },
  })

  const toResult = (dto: PaymentIntentDto): PaymentResult => {
    const intent = toIntent(dto)

    switch (dto.status) {
      case 'succeeded':
        return { status: 'succeeded', intent }

      case 'requires_action': {
        const challenge = dto.nextAction?.three_d_secure
        if (!challenge) {
          return {
            status: 'error',
            intent,
            error: {
              code: 'missing_next_action',
              message: 'The payment needs authentication, but the provider sent no way to do it.',
            },
          }
        }
        return {
          status: 'requires_action',
          intent,
          action: toChallengeAction(challenge.challengeId),
        }
      }

      case 'declined':
        return {
          status: 'declined',
          intent,
          error: dto.error
            ? { code: dto.error.code, message: dto.error.message }
            : { code: 'card_declined', message: 'Your card was declined.' },
        }

      case 'processing':
        return { status: 'processing', intent }

      default:
        return {
          status: 'error',
          intent,
          error: {
            code: 'unexpected_status',
            message: `The provider reported an unexpected status: ${dto.status}.`,
          },
        }
    }
  }

  /** The ACS verdict, read here rather than anywhere upstream. */
  const outcomeOf = (evidence: ActionEvidence): 'success' | 'fail' | null => {
    if (evidence.via === 'post_message')
      return evidence.data.transStatus === 'Y' ? 'success' : 'fail'
    if (evidence.via === 'return_url')
      return evidence.params.transStatus === 'Y' ? 'success' : 'fail'
    return null
  }

  return {
    createIntent: async (input: CreateIntentInput, opts: CallOptions): Promise<PaymentIntent> => {
      const dto = await http.post<PaymentIntentDto>(
        '/payment-intents',
        { planId: input.planId },
        { headers: { 'Idempotency-Key': opts.idempotencyKey }, signal: opts.signal },
      )
      return toIntent(dto)
    },

    confirm: async (intentId, instrument: PaymentInstrument, opts) => {
      if (instrument.kind !== 'card') {
        return {
          status: 'error',
          error: {
            code: 'unsupported_instrument',
            message: `This provider takes card details, not "${instrument.kind}".`,
          },
        }
      }

      try {
        const dto = await http.post<PaymentIntentDto>(
          `/payment-intents/${intentId}/confirm`,
          { cardNumber: normalizeCardNumber(instrument.number) },
          { signal: opts.signal },
        )
        return toResult(dto)
      } catch (cause) {
        return { status: 'error', error: toPaymentError(cause, 'The payment could not be taken.') }
      }
    },

    resume: async (_intentId, evidence, opts) => {
      const outcome = outcomeOf(evidence)
      if (!outcome) {
        return {
          status: 'error',
          error:
            evidence.via === 'aborted'
              ? { code: 'authentication_aborted', message: 'Authentication was not completed.' }
              : {
                  code: 'unsupported_evidence',
                  message: `This provider cannot continue from "${evidence.via}" evidence.`,
                },
        }
      }

      try {
        // The ACS already checked the human's one-time code; only its verdict travels
        // here, and the backend is what actually settles the payment.
        const { paymentIntent } = await http.post<{ paymentIntent: PaymentIntentDto }>(
          `/3ds/challenge/${evidence.actionId}/complete`,
          { outcome },
          { headers: { Accept: 'application/json' }, signal: opts.signal },
        )
        return toResult(paymentIntent)
      } catch (cause) {
        return {
          status: 'error',
          error: toPaymentError(cause, 'Authentication could not be completed.'),
        }
      }
    },

    getIntent: async (intentId, opts) =>
      toIntent(
        await http.get<PaymentIntentDto>(`/payment-intents/${intentId}`, {
          signal: opts.signal,
        }),
      ),

    cancel: async (intentId, opts) =>
      toIntent(
        await http.post<PaymentIntentDto>(
          `/payment-intents/${intentId}/cancel`,
          {},
          {
            signal: opts.signal,
          },
        ),
      ),
  }
}

export const pspProvider: PaymentProvider<PspConfig> = {
  id: PROVIDER_ID,
  displayName: 'Card processor',
  capabilities,
  create: createPspProvider,
}
