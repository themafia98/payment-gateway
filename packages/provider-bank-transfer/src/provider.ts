// Instant bank transfer: the shopper is shown a code, pays it in their banking app, and
// the money turns up a moment later.
//
// This is how a large part of the world pays - PIX in Brazil, UPI in India, BLIK in
// Poland, PromptPay in Thailand. Nothing on the page can see it happen, so the action is
// completed by polling and the outcome is always read back from the provider.

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

export interface BankTransferConfig {
  readonly baseUrl: string
  /** How the code is shown. A QR to scan, a short code to type, or written steps. */
  readonly format?: 'qr' | 'code' | 'instructions'
  /** How often to ask whether the money arrived, and for how long. */
  readonly poll?: { readonly intervalMs: number; readonly timeoutMs: number }
  /** One line telling the shopper what to do. Yours to translate. */
  readonly instructions?: string
}

declare module '@checkout-kit/core' {
  interface ProviderConfigRegistry {
    transfer: BankTransferConfig
  }
}

export const PROVIDER_ID = 'transfer'

const DEFAULT_POLL = { intervalMs: 2000, timeoutMs: 15 * 60 * 1000 }

interface OrderDto {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  error?: { code?: string; message: string } | null
}

interface CodeDto {
  order: OrderDto
  payload: string
  qrImageUrl?: string
  deeplink?: string
  expiresAt?: string
}

const capabilities: ProviderCapabilities = {
  // There is no card to collect: the shopper's bank has one already.
  instruments: ['none'],
  actions: ['display'],
  surfaces: ['inline'],
  authentication: ['none'],
  session: 'lazy',
  cancel: true,
  // Not optional here. Polling is the only way this payment can ever finish.
  poll: true,
  idempotency: 'header',
}

export const createBankTransferProvider = (
  ctx: ProviderContext<BankTransferConfig>,
  http: HttpClient = createHttpClient({ baseUrl: ctx.config.baseUrl, fetch: ctx.fetch }),
): PaymentProviderInstance => {
  const poll = ctx.config.poll ?? DEFAULT_POLL

  const toIntent = (dto: OrderDto): PaymentIntent => ({
    id: dto.id,
    amount: dto.amount,
    currency: dto.currency,
    status: dto.status,
    providerId: PROVIDER_ID,
  })

  const readOrder = (orderId: string, opts: CallOptions) =>
    http.get<OrderDto>(`/transfer/orders/${orderId}`, { signal: opts.signal })

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
            : { code: 'transfer_rejected', message: 'The transfer was rejected by the bank.' },
        }
      case 'canceled':
        return {
          status: 'error',
          intent,
          error: { code: 'canceled', message: 'The payment was canceled.' },
        }
      default:
        // The code was never paid. Not an error the shopper can act on beyond trying again.
        return {
          status: 'error',
          intent,
          error: { code: 'not_paid', message: 'The payment was not completed. You can try again.' },
        }
    }
  }

  return {
    createIntent: async (input: CreateIntentInput, opts: CallOptions): Promise<PaymentIntent> =>
      toIntent(
        await http.post<OrderDto>(
          '/transfer/orders',
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
            message: 'A bank transfer is paid in the bank app; nothing should be sent to it.',
          },
        }
      }

      try {
        const code = await http.post<CodeDto>(
          `/transfer/orders/${intentId}/code`,
          {},
          { signal: opts.signal },
        )

        return {
          status: 'requires_action',
          intent: toIntent(code.order),
          action: {
            id: intentId,
            kind: 'display',
            purpose: 'authorize',
            surface: 'inline',
            format: ctx.config.format ?? 'qr',
            value: code.payload,
            imageUrl: code.qrImageUrl,
            deeplink: code.deeplink,
            instructions: ctx.config.instructions,
            expiresAt: code.expiresAt,
            completion: { via: 'poll', ...poll },
          },
        }
      } catch (cause) {
        return {
          status: 'error',
          error: {
            code: 'code_unavailable',
            message: cause instanceof Error ? cause.message : 'The payment code is unavailable.',
          },
        }
      }
    },

    resume: async (intentId, evidence, opts) => {
      if (evidence.actionId !== intentId) {
        return {
          status: 'error',
          error: {
            code: 'evidence_mismatch',
            message: 'That result belongs to a different payment.',
          },
        }
      }

      if (evidence.via === 'aborted') {
        return {
          status: 'error',
          error:
            evidence.reason === 'timeout'
              ? { code: 'code_expired', message: 'The payment code expired before it was paid.' }
              : { code: 'payment_abandoned', message: 'The payment was not completed.' },
        }
      }

      try {
        // The engine polls, so it already believes the payment has settled. It is still
        // the provider that says how.
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

    cancel: async (intentId, opts) =>
      toIntent(
        await http.post<OrderDto>(
          `/transfer/orders/${intentId}/cancel`,
          {},
          { signal: opts.signal },
        ),
      ),
  }
}

export const bankTransferProvider: PaymentProvider<BankTransferConfig> = {
  id: PROVIDER_ID,
  displayName: 'Instant bank transfer',
  capabilities,
  create: createBankTransferProvider,
}
