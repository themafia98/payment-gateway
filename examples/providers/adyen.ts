// Adyen, through your own API.
//
// Adyen answers with a `resultCode` and, when it needs something from the shopper, an
// `action` object. The `action.type` decides everything: a `redirect` is a redirect, a
// `threeDS2` wants Adyen's own SDK to run. Both are here.
//
// The endpoints it expects are in ./README.md.

import { createHttpClient, type HttpClient } from '@checkout-kit/core/http'
import type {
  ActionEvidence,
  CallOptions,
  CreateIntentInput,
  PaymentAction,
  PaymentIntent,
  PaymentInstrument,
  PaymentProvider,
  PaymentProviderInstance,
  PaymentResult,
  PaymentStatus,
  ProviderCapabilities,
  ProviderContext,
} from '@checkout-kit/core'

export interface AdyenConfig {
  readonly baseUrl: string
  /** Key of the SDK adapter the host registered for Adyen's own 3-D Secure 2 component. */
  readonly sdk: string
  readonly scriptUrl: string
  readonly integrity?: string
}

declare module '@checkout-kit/core' {
  interface ProviderConfigRegistry {
    adyen: AdyenConfig
  }
}

export const PROVIDER_ID = 'adyen'

/** https://docs.adyen.com/development-resources/response-handling */
type ResultCode =
  | 'Authorised'
  | 'Refused'
  | 'Error'
  | 'Cancelled'
  | 'Pending'
  | 'Received'
  | 'RedirectShopper'
  | 'IdentifyShopper'
  | 'ChallengeShopper'

interface AdyenAction {
  type: 'redirect' | 'threeDS2'
  /** Adyen's own handle for the payment in flight. It goes back with the details. */
  paymentData: string
  url?: string
  method?: 'GET' | 'POST'
  data?: Record<string, string>
  token?: string
  subtype?: string
}

interface PaymentDto {
  id: string
  amount: number
  currency: string
  resultCode: ResultCode
  action: AdyenAction | null
  refusalReason?: string
  refusalReasonCode?: string
}

const capabilities: ProviderCapabilities = {
  instruments: ['card', 'token'],
  actions: ['redirect', 'sdk_handoff'],
  surfaces: ['top', 'none'],
  authentication: ['none', '3ds1', '3ds2'],
  session: 'lazy',
  cancel: true,
  // `Received` can take days for some local methods.
  poll: true,
  idempotency: 'header',
}

const toStatus = (code: ResultCode): PaymentStatus => {
  switch (code) {
    case 'Authorised':
      return 'succeeded'
    case 'Refused':
    case 'Error':
      return 'declined'
    case 'Cancelled':
      return 'canceled'
    case 'Pending':
    case 'Received':
      return 'processing'
    default:
      return 'requires_action'
  }
}

export const createAdyenProvider = (
  ctx: ProviderContext<AdyenConfig>,
  http: HttpClient = createHttpClient({ baseUrl: ctx.config.baseUrl, fetch: ctx.fetch }),
): PaymentProviderInstance => {
  const toIntent = (dto: PaymentDto): PaymentIntent => ({
    id: dto.id,
    amount: dto.amount,
    currency: dto.currency,
    status: toStatus(dto.resultCode),
    providerId: PROVIDER_ID,
  })

  const toAction = (dto: PaymentDto, action: AdyenAction): PaymentAction => {
    if (action.type === 'redirect') {
      return {
        id: dto.id,
        kind: 'redirect',
        purpose: 'authenticate',
        surface: 'top',
        url: action.url ?? '',
        method: action.method ?? 'GET',
        // Adyen hands over the fields to post; they go through untouched.
        fields: action.data,
        returnUrlField: 'returnUrl',
        completion: { via: 'return_url' },
      }
    }

    return {
      id: dto.id,
      kind: 'sdk_handoff',
      purpose: 'authenticate',
      surface: 'none',
      sdk: ctx.config.sdk,
      scriptUrl: ctx.config.scriptUrl,
      integrity: ctx.config.integrity,
      params: { token: action.token, subtype: action.subtype },
      completion: { via: 'sdk_callback' },
    }
  }

  const toResult = (dto: PaymentDto): PaymentResult => {
    const intent = toIntent(dto)

    if (dto.action) {
      return { status: 'requires_action', intent, action: toAction(dto, dto.action) }
    }

    switch (dto.resultCode) {
      case 'Authorised':
        return { status: 'succeeded', intent }

      case 'Pending':
      case 'Received':
        return { status: 'processing', intent }

      case 'Refused':
        return {
          status: 'declined',
          intent,
          error: {
            code: dto.refusalReasonCode,
            // Adyen's refusal reason is the issuer's, which is what the shopper needs.
            message: dto.refusalReason ?? 'The payment was refused.',
          },
        }

      case 'Cancelled':
        return {
          status: 'error',
          intent,
          error: { code: 'canceled', message: 'The payment was cancelled.' },
        }

      default:
        return {
          status: 'error',
          intent,
          error: { code: 'payment_error', message: dto.refusalReason ?? 'The payment failed.' },
        }
    }
  }

  return {
    createIntent: async (input: CreateIntentInput, opts: CallOptions): Promise<PaymentIntent> =>
      toIntent(
        await http.post<PaymentDto>(
          '/payments/sessions',
          { planId: input.planId },
          { headers: { 'Idempotency-Key': opts.idempotencyKey }, signal: opts.signal },
        ),
      ),

    confirm: async (intentId, instrument: PaymentInstrument, opts) => {
      if (instrument.kind !== 'card' && instrument.kind !== 'token') {
        return {
          status: 'error',
          error: {
            code: 'unsupported_instrument',
            message: `This provider takes a card or a saved card, not "${instrument.kind}".`,
          },
        }
      }

      const paymentMethod =
        instrument.kind === 'card'
          ? {
              type: 'scheme',
              number: instrument.number,
              expiryMonth: instrument.exp.slice(0, 2),
              expiryYear: instrument.exp.slice(-2),
              cvc: instrument.cvc,
              holderName: instrument.holder,
            }
          : { type: 'scheme', storedPaymentMethodId: instrument.token }

      try {
        return toResult(
          await http.post<PaymentDto>(
            `/payments/${intentId}`,
            { paymentMethod },
            { headers: { 'Idempotency-Key': opts.idempotencyKey }, signal: opts.signal },
          ),
        )
      } catch (cause) {
        return {
          status: 'error',
          error: {
            code: 'payment_failed',
            message: cause instanceof Error ? cause.message : 'The payment could not be taken.',
          },
        }
      }
    },

    resume: async (intentId, evidence: ActionEvidence, opts) => {
      if (evidence.via === 'aborted') {
        return {
          status: 'error',
          error: { code: 'payment_abandoned', message: 'The payment was not completed.' },
        }
      }

      // Adyen calls this "details": whatever came back from the redirect or its SDK, posted
      // to /payments/details. The shape differs per action, so it is passed through as is.
      const details =
        evidence.via === 'return_url'
          ? evidence.params
          : evidence.via === 'sdk_callback'
            ? (evidence.payload as Record<string, string>)
            : null

      if (!details) {
        return {
          status: 'error',
          error: {
            code: 'unsupported_evidence',
            message: `This provider cannot continue from "${evidence.via}" evidence.`,
          },
        }
      }

      try {
        return toResult(
          await http.post<PaymentDto>(
            `/payments/${intentId}/details`,
            { details },
            { signal: opts.signal },
          ),
        )
      } catch (cause) {
        return {
          status: 'error',
          error: {
            code: 'details_failed',
            message:
              cause instanceof Error ? cause.message : 'The authentication could not be finished.',
          },
        }
      }
    },

    getIntent: async (intentId, opts) =>
      toIntent(await http.get<PaymentDto>(`/payments/${intentId}`, { signal: opts.signal })),

    cancel: async (intentId, opts) =>
      toIntent(
        await http.post<PaymentDto>(`/payments/${intentId}/cancel`, {}, { signal: opts.signal }),
      ),
  }
}

export const adyenProvider: PaymentProvider<AdyenConfig> = {
  id: PROVIDER_ID,
  displayName: 'Adyen',
  capabilities,
  create: createAdyenProvider,
}

export default adyenProvider
