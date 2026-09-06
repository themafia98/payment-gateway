// PayPal, through your own API.
//
// No card is ever collected here: the shopper approves the order on PayPal's site and comes
// back. The part people get wrong is the end - coming back is approval, not payment, and
// the money only moves when your server captures the order.
//
// The endpoints it expects are in ./README.md.

import { createHttpClient, type HttpClient } from '@checkout-kit/core/http'
import type {
  ActionEvidence,
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

export interface PayPalConfig {
  readonly baseUrl: string
}

declare module '@checkout-kit/core' {
  interface ProviderConfigRegistry {
    paypal: PayPalConfig
  }
}

export const PROVIDER_ID = 'paypal'

/** https://developer.paypal.com/docs/api/orders/v2/#orders_get */
type OrderStatus =
  'CREATED' | 'SAVED' | 'APPROVED' | 'PAYER_ACTION_REQUIRED' | 'VOIDED' | 'COMPLETED'

interface OrderDto {
  id: string
  status: OrderStatus
  amount: number
  currency: string
  /** The link with `rel: "payer-action"`, already picked out by your server. */
  approveUrl?: string
  error?: { code?: string; message: string } | null
}

const capabilities: ProviderCapabilities = {
  // Nothing is collected on this page.
  instruments: ['none'],
  actions: ['redirect'],
  // PayPal will not be framed.
  surfaces: ['top'],
  authentication: ['none'],
  session: 'lazy',
  cancel: true,
  poll: true,
  idempotency: 'header',
}

const toStatus = (status: OrderStatus): PaymentStatus => {
  switch (status) {
    case 'COMPLETED':
      return 'succeeded'
    case 'VOIDED':
      return 'canceled'
    case 'APPROVED':
      // Approved but not captured: the money has not moved yet.
      return 'processing'
    default:
      return 'requires_payment_method'
  }
}

export const createPayPalProvider = (
  ctx: ProviderContext<PayPalConfig>,
  http: HttpClient = createHttpClient({ baseUrl: ctx.config.baseUrl, fetch: ctx.fetch }),
): PaymentProviderInstance => {
  const toIntent = (dto: OrderDto): PaymentIntent => ({
    id: dto.id,
    amount: dto.amount,
    currency: dto.currency,
    status: toStatus(dto.status),
    providerId: PROVIDER_ID,
  })

  const read = (orderId: string, opts: CallOptions) =>
    http.get<OrderDto>(`/paypal/orders/${orderId}`, { signal: opts.signal })

  const toResult = (dto: OrderDto): PaymentResult => {
    const intent = toIntent(dto)

    switch (dto.status) {
      case 'COMPLETED':
        return { status: 'succeeded', intent }

      case 'VOIDED':
        return {
          status: 'error',
          intent,
          error: { code: 'canceled', message: 'The payment was cancelled.' },
        }

      case 'APPROVED':
        // Should not last: the capture below runs straight after approval. If it does, the
        // engine polls until the server has finished.
        return { status: 'processing', intent }

      default:
        return {
          status: 'error',
          intent,
          error: dto.error ?? {
            code: 'not_approved',
            message: 'The payment was not approved. You can try again.',
          },
        }
    }
  }

  return {
    createIntent: async (input: CreateIntentInput, opts: CallOptions): Promise<PaymentIntent> =>
      toIntent(
        await http.post<OrderDto>(
          '/paypal/orders',
          { planId: input.planId },
          { headers: { 'Idempotency-Key': opts.idempotencyKey }, signal: opts.signal },
        ),
      ),

    confirm: async (intentId, instrument: PaymentInstrument, opts) => {
      if (instrument.kind !== 'none') {
        return {
          status: 'error',
          error: {
            code: 'unsupported_instrument',
            message: 'PayPal collects payment on its own site; nothing should be sent to it.',
          },
        }
      }

      try {
        const order = await read(intentId, opts)
        if (!order.approveUrl) {
          return {
            status: 'error',
            intent: toIntent(order),
            error: { code: 'no_approval_url', message: 'PayPal did not return a link.' },
          }
        }

        return {
          status: 'requires_action',
          intent: toIntent(order),
          action: {
            id: intentId,
            kind: 'redirect',
            purpose: 'authorize',
            surface: 'top',
            url: order.approveUrl,
            method: 'GET',
            completion: { via: 'return_url' },
          },
        }
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

    resume: async (intentId, evidence: ActionEvidence, opts) => {
      if (evidence.via === 'aborted') {
        return {
          status: 'error',
          error: { code: 'payment_abandoned', message: 'The payment was not completed.' },
        }
      }

      try {
        // Coming back means approved, not paid. Capture is what moves the money, and it
        // happens on your server - which is also why the query string is not consulted.
        return toResult(
          await http.post<OrderDto>(
            `/paypal/orders/${intentId}/capture`,
            {},
            { headers: { 'Idempotency-Key': intentId }, signal: opts.signal },
          ),
        )
      } catch (cause) {
        return {
          status: 'error',
          error: {
            code: 'capture_failed',
            message: cause instanceof Error ? cause.message : 'The payment could not be captured.',
          },
        }
      }
    },

    getIntent: async (intentId, opts) => toIntent(await read(intentId, opts)),

    cancel: async (intentId, opts) =>
      toIntent(
        await http.post<OrderDto>(
          `/paypal/orders/${intentId}/cancel`,
          {},
          {
            signal: opts.signal,
          },
        ),
      ),
  }
}

export const payPalProvider: PaymentProvider<PayPalConfig> = {
  id: PROVIDER_ID,
  displayName: 'PayPal',
  capabilities,
  create: createPayPalProvider,
}

export default payPalProvider
