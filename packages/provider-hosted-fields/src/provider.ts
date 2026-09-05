// Hosted card fields: the provider renders the inputs in its own frame and hands back a
// token. This plugin has no way to read a card, which is the point.

import { createHttpClient, type HttpClient } from '@pg/core/http'
import type {
  CallOptions,
  CreateIntentInput,
  PaymentIntent,
  PaymentInstrument,
  PaymentProvider,
  PaymentProviderInstance,
  PaymentResult,
  PaymentStatus,
  ProviderCapabilities,
  ProviderContext,
} from '@pg/core'

export interface HostedFieldsConfig {
  readonly baseUrl: string
  /** Where the provider's field frame is served from. */
  readonly fieldsUrl: string
  /** Origin of that frame. Messages from anywhere else are ignored. */
  readonly fieldsOrigin: string
}

declare module '@pg/core' {
  interface ProviderConfigRegistry {
    hostedfields: HostedFieldsConfig
  }
}

export const PROVIDER_ID = 'hostedfields'

interface ChargeDto {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  error?: { code?: string; message: string } | null
}

const capabilities: ProviderCapabilities = {
  // A token, once the frame has produced one. Never a card.
  instruments: ['none', 'token'],
  actions: ['collect_fields'],
  surfaces: ['inline'],
  authentication: ['none'],
  session: 'lazy',
  cancel: true,
  poll: true,
  idempotency: 'header',
}

export const createHostedFieldsProvider = (
  ctx: ProviderContext<HostedFieldsConfig>,
  http: HttpClient = createHttpClient({ baseUrl: ctx.config.baseUrl, fetch: ctx.fetch }),
): PaymentProviderInstance => {
  const toIntent = (dto: ChargeDto): PaymentIntent => ({
    id: dto.id,
    amount: dto.amount,
    currency: dto.currency,
    status: dto.status,
    providerId: PROVIDER_ID,
  })

  const toResult = (dto: ChargeDto): PaymentResult => {
    const intent = toIntent(dto)

    switch (dto.status) {
      case 'succeeded':
        return { status: 'succeeded', intent }
      case 'processing':
        return { status: 'processing', intent }
      case 'declined':
        return {
          status: 'declined',
          intent,
          error: dto.error
            ? { code: dto.error.code, message: dto.error.message }
            : { code: 'card_declined', message: 'Your card was declined.' },
        }
      default:
        return {
          status: 'error',
          intent,
          error: { code: 'not_charged', message: 'The payment was not completed.' },
        }
    }
  }

  return {
    createIntent: async (input: CreateIntentInput, opts: CallOptions): Promise<PaymentIntent> =>
      toIntent(
        await http.post<ChargeDto>(
          '/hosted-fields/charges',
          { planId: input.planId },
          { headers: { 'Idempotency-Key': opts.idempotencyKey }, signal: opts.signal },
        ),
      ),

    confirm: async (intentId, instrument: PaymentInstrument) => {
      if (instrument.kind !== 'none') {
        return {
          status: 'error',
          error: {
            code: 'unsupported_instrument',
            message: 'This provider collects the card itself; nothing should be sent to it.',
          },
        }
      }

      // Ask for the fields. Everything about the card happens on the other side of this.
      return {
        status: 'requires_action',
        intent: {
          id: intentId,
          amount: 0,
          currency: 'USD',
          status: 'requires_payment_method',
          providerId: PROVIDER_ID,
        },
        action: {
          id: intentId,
          kind: 'collect_fields',
          purpose: 'collect',
          surface: 'inline',
          url: ctx.config.fieldsUrl,
          origin: ctx.config.fieldsOrigin,
          fields: ['number', 'exp', 'cvc'],
          completion: {
            via: 'post_message',
            origin: ctx.config.fieldsOrigin,
            type: 'pg-fields-token',
          },
        },
      }
    },

    resume: async (intentId, evidence, opts) => {
      if (evidence.via !== 'post_message') {
        return {
          status: 'error',
          error:
            evidence.via === 'aborted'
              ? { code: 'fields_abandoned', message: 'The card details were not completed.' }
              : {
                  code: 'unsupported_evidence',
                  message: `This provider cannot continue from "${evidence.via}" evidence.`,
                },
        }
      }

      const token = typeof evidence.data.token === 'string' ? evidence.data.token : ''
      if (!token) {
        return {
          status: 'error',
          error: { code: 'missing_token', message: 'The card details produced no token.' },
        }
      }

      try {
        // The token is exchanged server-side. This page has never held anything else.
        return toResult(
          await http.post<ChargeDto>(
            `/hosted-fields/charges/${intentId}/pay`,
            { token },
            { signal: opts.signal },
          ),
        )
      } catch (cause) {
        return {
          status: 'error',
          error: {
            code: 'charge_failed',
            message: cause instanceof Error ? cause.message : 'The payment could not be taken.',
          },
        }
      }
    },

    getIntent: async (intentId, opts) =>
      toIntent(
        await http.get<ChargeDto>(`/hosted-fields/charges/${intentId}`, { signal: opts.signal }),
      ),

    cancel: async (intentId, opts) =>
      toIntent(
        await http.post<ChargeDto>(
          `/hosted-fields/charges/${intentId}/cancel`,
          {},
          { signal: opts.signal },
        ),
      ),
  }
}

export const hostedFieldsProvider: PaymentProvider<HostedFieldsConfig> = {
  id: PROVIDER_ID,
  displayName: 'Hosted card fields',
  capabilities,
  create: createHostedFieldsProvider,
}
