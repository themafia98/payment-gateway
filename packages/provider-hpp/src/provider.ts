// A hosted payment page: the shopper leaves for the bank's own form and comes back with a
// query string. Our code never sees a card.
//
// The interesting part is `resume`: the browser returns saying `status=success` on a URL
// the shopper could have typed, so the plugin ignores it and re-reads the order.

import { createHttpClient, type HttpClient } from '@checkout-kit/core/http'
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
} from '@checkout-kit/core'

export interface HostedPageConfig {
  /** Root of the merchant-facing API used to register and read orders. */
  readonly baseUrl: string
  /**
   * Where the bank's payment form lives. A different site in production; the demo stands
   * one in, because a front-end-only mock cannot answer requests from another origin.
   */
  readonly pageUrl: string
}

declare module '@checkout-kit/core' {
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
