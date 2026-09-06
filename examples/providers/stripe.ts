// Stripe, through your own API.
//
// Your server holds the secret key and talks to Stripe; this plugin talks to your server.
// The shapes below are Stripe's real ones - PaymentIntent statuses, `next_action`,
// `last_payment_error` - because passing them through unchanged is the least work and the
// least to get wrong.
//
// The endpoints it expects are in ./README.md.

import { createHttpClient, type HttpClient } from '@checkout-kit/core/http'
import type {
  ActionEvidence,
  CallOptions,
  CreateIntentInput,
  PaymentError,
  PaymentIntent,
  PaymentInstrument,
  PaymentProvider,
  PaymentProviderInstance,
  PaymentResult,
  PaymentStatus,
  ProviderCapabilities,
  ProviderContext,
} from '@checkout-kit/core'

export interface StripeConfig {
  /** Root of your API, not Stripe's. */
  readonly baseUrl: string
}

declare module '@checkout-kit/core' {
  interface ProviderConfigRegistry {
    stripe: StripeConfig
  }
}

export const PROVIDER_ID = 'stripe'

/** https://docs.stripe.com/api/payment_intents/object#payment_intent_object-status */
type StripeStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'succeeded'
  | 'canceled'

interface StripeNextAction {
  type: 'redirect_to_url' | 'use_stripe_sdk'
  redirect_to_url?: { url: string; return_url: string }
}

interface PaymentIntentDto {
  id: string
  amount: number
  currency: string
  status: StripeStatus
  next_action: StripeNextAction | null
  last_payment_error: { code?: string; decline_code?: string; message: string } | null
}

const capabilities: ProviderCapabilities = {
  // A card typed here, or one saved on a previous visit as a payment method id.
  instruments: ['card', 'token'],
  actions: ['redirect'],
  // Stripe redirects for 3-D Secure; it does not want to be framed.
  surfaces: ['top'],
  authentication: ['none', '3ds2'],
  session: 'lazy',
  cancel: true,
  poll: true,
  idempotency: 'header',
}

const toStatus = (status: StripeStatus): PaymentStatus => {
  switch (status) {
    case 'succeeded':
    case 'requires_capture':
      return 'succeeded'
    case 'processing':
      return 'processing'
    case 'requires_action':
      return 'requires_action'
    case 'canceled':
      return 'canceled'
    default:
      return 'requires_payment_method'
  }
}

const toError = (dto: PaymentIntentDto): PaymentError => ({
  // `decline_code` is the specific reason and the more useful one when it is there.
  code: dto.last_payment_error?.decline_code ?? dto.last_payment_error?.code,
  message: dto.last_payment_error?.message ?? 'The payment could not be completed.',
})

export const createStripeProvider = (
  ctx: ProviderContext<StripeConfig>,
  http: HttpClient = createHttpClient({ baseUrl: ctx.config.baseUrl, fetch: ctx.fetch }),
): PaymentProviderInstance => {
  const toIntent = (dto: PaymentIntentDto): PaymentIntent => ({
    id: dto.id,
    amount: dto.amount,
    currency: dto.currency.toUpperCase(),
    status: toStatus(dto.status),
    providerId: PROVIDER_ID,
  })

  const toResult = (dto: PaymentIntentDto): PaymentResult => {
    const intent = toIntent(dto)

    if (dto.status === 'requires_action') {
      const redirect = dto.next_action?.redirect_to_url
      if (!redirect) {
        // `use_stripe_sdk` means Stripe.js has to run. That is a different integration -
        // an sdk_handoff action - and this plugin does not do it.
        return {
          status: 'error',
          intent,
          error: { code: 'unsupported_action', message: 'This payment needs Stripe.js.' },
        }
      }

      return {
        status: 'requires_action',
        intent,
        action: {
          id: dto.id,
          kind: 'redirect',
          purpose: 'authenticate',
          surface: 'top',
          url: redirect.url,
          method: 'GET',
          // The engine fills this in. Only the host knows its own base path.
          returnUrlField: 'return_url',
          completion: { via: 'return_url' },
        },
      }
    }

    if (dto.status === 'succeeded' || dto.status === 'requires_capture') {
      return { status: 'succeeded', intent }
    }

    if (dto.status === 'processing') {
      return { status: 'processing', intent }
    }

    if (dto.last_payment_error) {
      return { status: 'declined', intent, error: toError(dto) }
    }

    return {
      status: 'error',
      intent,
      error: { code: 'not_completed', message: 'The payment was not completed.' },
    }
  }

  const read = (intentId: string, opts: CallOptions) =>
    http.get<PaymentIntentDto>(`/payments/${intentId}`, { signal: opts.signal })

  return {
    createIntent: async (input: CreateIntentInput, opts: CallOptions): Promise<PaymentIntent> => {
      const dto = await http.post<PaymentIntentDto>(
        '/payments',
        // The plan id, never a price: a browser that can name its own amount will.
        { planId: input.planId },
        { headers: { 'Idempotency-Key': opts.idempotencyKey }, signal: opts.signal },
      )

      return toIntent(dto)
    },

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

      const body =
        instrument.kind === 'card'
          ? {
              card: {
                number: instrument.number,
                exp: instrument.exp,
                cvc: instrument.cvc,
                holder: instrument.holder,
              },
            }
          : { paymentMethodId: instrument.token }

      try {
        return toResult(
          await http.post<PaymentIntentDto>(`/payments/${intentId}/confirm`, body, {
            headers: { 'Idempotency-Key': opts.idempotencyKey },
            signal: opts.signal,
          }),
        )
      } catch (cause) {
        return {
          status: 'error',
          error: {
            code: 'confirm_failed',
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

      try {
        // The browser is back from the bank. What the URL says is a hint; Stripe is the
        // answer, so read the intent again rather than trusting the query string.
        return toResult(await read(intentId, opts))
      } catch (cause) {
        return {
          status: 'error',
          error: {
            code: 'payment_unreadable',
            message: cause instanceof Error ? cause.message : 'The payment could not be read.',
          },
        }
      }
    },

    getIntent: async (intentId, opts) => toIntent(await read(intentId, opts)),

    cancel: async (intentId, opts) =>
      toIntent(
        await http.post<PaymentIntentDto>(
          `/payments/${intentId}/cancel`,
          {},
          {
            signal: opts.signal,
          },
        ),
      ),
  }
}

export const stripeProvider: PaymentProvider<StripeConfig> = {
  id: PROVIDER_ID,
  displayName: 'Stripe',
  capabilities,
  create: createStripeProvider,
}

export default stripeProvider
