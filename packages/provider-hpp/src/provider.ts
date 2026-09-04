// A hosted payment page: the shopper leaves for the bank's own form, types the card
// there, and comes back with a few query parameters.
//
// This is the integration where the merchant's code sees no card data at all, and the
// contract absorbs it without a special case: `confirm` is handed
// `{ kind: 'none' }` and answers "I need an action first". The action happens to take over
// the whole window rather than render in a frame, and the engine already knows how to run
// that, because a 3-D Secure redirect works the same way.
//
// The interesting part is `resume`. The browser comes back carrying `status=success` on a
// URL the shopper could have typed themselves, and this plugin ignores it entirely: the
// only thing it believes is the order read back from the bank.

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

export interface HostedPageConfig {
  /** Root of the merchant-facing API used to register and read orders. */
  readonly baseUrl: string
  /**
   * Where the bank's payment form lives. A different site in production; the demo stands
   * one in, because a front-end-only mock cannot answer requests from another origin.
   */
  readonly pageUrl: string
}

declare module '@pg/core' {
  interface ProviderConfigRegistry {
    hpp: HostedPageConfig
  }
}

export const PROVIDER_ID = 'hpp'

interface OrderDto {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  error?: { code?: string; message: string } | null
}

const capabilities: ProviderCapabilities = {
  // Nothing is collected on our side. The checkout renders no card fields for this one.
  instruments: ['none'],
  actions: ['redirect'],
  // Top window only: a bank's payment page refuses to be framed, and rightly so.
  surfaces: ['top'],
  authentication: ['none', '3ds1', '3ds2'],
  session: 'lazy',
  cancel: false,
  poll: true,
  idempotency: 'header',
}

export const createHostedPageProvider = (
  ctx: ProviderContext<HostedPageConfig>,
  http: HttpClient = createHttpClient({ baseUrl: ctx.config.baseUrl, fetch: ctx.fetch }),
): PaymentProviderInstance => {
  const toIntent = (dto: OrderDto): PaymentIntent => ({
    id: dto.id,
    amount: dto.amount,
    currency: dto.currency,
    status: dto.status,
    providerId: PROVIDER_ID,
  })

  const readOrder = (orderId: string, opts: CallOptions) =>
    http.get<OrderDto>(`/hosted/orders/${orderId}`, { signal: opts.signal })

  const toResult = (dto: OrderDto): PaymentResult => {
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
      case 'canceled':
        return {
          status: 'error',
          intent,
          error: { code: 'canceled', message: 'The payment was canceled.' },
        }
      default:
        // Back from the bank with nothing decided: the shopper closed the page, or came
        // back before finishing. Not an error, and certainly not a success.
        return {
          status: 'error',
          intent,
          error: {
            code: 'not_completed',
            message: 'The payment was not completed. You can try again.',
          },
        }
    }
  }

  return {
    createIntent: async (input: CreateIntentInput, opts: CallOptions): Promise<PaymentIntent> => {
      const { orderId } = await http.post<{ orderId: string }>(
        '/hosted/orders',
        { planId: input.planId },
        { headers: { 'Idempotency-Key': opts.idempotencyKey }, signal: opts.signal },
      )

      return toIntent(await readOrder(orderId, opts))
    },

    confirm: async (intentId, instrument: PaymentInstrument, opts) => {
      if (instrument.kind !== 'none') {
        return {
          status: 'error',
          error: {
            code: 'unsupported_instrument',
            message:
              'This provider collects the card on its own page; nothing should be sent to it.',
          },
        }
      }

      try {
        const order = await readOrder(intentId, opts)

        return {
          status: 'requires_action',
          intent: toIntent(order),
          action: {
            id: intentId,
            kind: 'redirect',
            purpose: 'authorize',
            surface: 'top',
            url: ctx.config.pageUrl,
            method: 'GET',
            fields: { orderId: intentId },
            returnUrlField: 'returnUrl',
            completion: { via: 'return_url' },
          },
        }
      } catch (cause) {
        return {
          status: 'error',
          error: {
            code: 'hosted_page_unavailable',
            message: cause instanceof Error ? cause.message : 'The payment page is unavailable.',
          },
        }
      }
    },

    resume: async (intentId, evidence, opts) => {
      if (evidence.via === 'aborted') {
        return {
          status: 'error',
          error: { code: 'payment_abandoned', message: 'The payment was not completed.' },
        }
      }

      try {
        // Whatever the URL says - `status=success` included - the answer comes from the
        // bank. The query parameters got here through the shopper's address bar.
        return toResult(await readOrder(intentId, opts))
      } catch (cause) {
        return {
          status: 'error',
          error: {
            code: 'order_unreadable',
            message: cause instanceof Error ? cause.message : 'The order could not be read.',
          },
        }
      }
    },

    getIntent: async (intentId, opts) => toIntent(await readOrder(intentId, opts)),
  }
}

export const hostedPageProvider: PaymentProvider<HostedPageConfig> = {
  id: PROVIDER_ID,
  displayName: 'Bank payment page',
  capabilities,
  create: createHostedPageProvider,
}
