import type { PaymentGateway, CreateIntentInput, CardInput } from './payment-gateway'
import type { PaymentIntent, PaymentResult, PaymentStatus } from '../model/types'
import { createHttpClient, type HttpClient, HttpError } from '@/shared/api'
import { normalizeCardNumber } from '@/shared/lib'

// Wire format (DTO) the backend returns. Declared locally (not imported from
// src/mocks) so production code never depends on test infrastructure.
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

/** DTO -> domain intent (drop wire-only fields like clientSecret/livemode). */
const toDomainIntent = (dto: PaymentIntentDto): PaymentIntent => ({
  id: dto.id,
  amount: dto.amount,
  currency: dto.currency,
  status: dto.status,
})

/** DTO -> domain result. Single source of the status mapping. */
const toPaymentResult = (dto: PaymentIntentDto): PaymentResult => {
  const intent = toDomainIntent(dto)
  switch (dto.status) {
    case 'succeeded':
      return { status: 'succeeded', intent }
    case 'requires_action':
      if (!dto.nextAction?.three_d_secure) {
        return { status: 'error', error: { message: 'Missing 3-D Secure action in response' } }
      }
      return {
        status: 'requires_action',
        intent,
        challenge: {
          challengeId: dto.nextAction.three_d_secure.challengeId,
          url: dto.nextAction.three_d_secure.url,
        },
      }
    case 'declined':
      return { status: 'declined', intent, error: dto.error ?? { message: 'Card declined' } }
    default:
      return { status: 'error', error: { message: `Unexpected status '${dto.status}'` } }
  }
}

// HTTP implementation of the PaymentGateway port. The only place that knows the
// URLs and DTO format; maps DTO -> domain so the wire format never leaks upward.
// The http client is injected (defaults to a real one) for testing with a fake.

export const createHttpPaymentGatewayAdapter = (
  http: HttpClient = createHttpClient(),
): PaymentGateway => ({
  async createIntent(input: CreateIntentInput, idempotencyKey: string): Promise<PaymentIntent> {
    const dto = await http.post<PaymentIntentDto>('/payment-intents', input, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return toDomainIntent(dto)
  },

  async confirm(intentId: string, card: CardInput): Promise<PaymentResult> {
    try {
      const dto = await http.post<PaymentIntent>(`/payment-intents/${intentId}/confirm`, {
        cardNumber: normalizeCardNumber(card.number),
      })

      switch (dto.status) {
        case 'succeeded':
          return { status: 'succeeded', intent: dto }
        case 'requires_action':
          if (!dto.nextAction || !dto.nextAction.three_d_secure) {
            throw new Error('Missing nextAction.three_d_secure for requires_action status')
          }
          return {
            status: 'requires_action',
            intent: dto,
            challenge: {
              challengeId: dto.nextAction.three_d_secure.challengeId,
              url: dto.nextAction.three_d_secure.url,
            },
          }
        case 'declined':
          return {
            status: 'declined',
            intent: dto,
            error: {
              message: `Unexpected status ${dto.status}`,
            },
          }
        default:
          return {
            status: 'error',
            error:
              dto instanceof HttpError
                ? dto
                : {
                    message: 'Unexpected error occurred',
                  },
          }
      }
    } catch (cause) {
      return {
        status: 'error',
        error:
          cause instanceof HttpError
            ? cause
            : {
                message: 'Unexpected error occurred',
              },
      }
    }
  },

  async cancel(intentId: string): Promise<void> {
    return http.post(`/payment-intents/${intentId}/cancel`, {})
  },

  async getIntent(intentId: string): Promise<PaymentIntent> {
    const dto = await http.get<PaymentIntentDto>(`/payment-intents/${intentId}`)
    return toDomainIntent(dto)
  },

  async authenticate(challengeId: string, outcome: 'success' | 'fail'): Promise<PaymentResult> {
    try {
      // The ACS already checked the human OTP; we pass only its Y/N verdict.
      // The mock settles the intent and returns the authoritative paymentIntent.
      const { paymentIntent } = await http.post<{ paymentIntent: PaymentIntentDto }>(
        `/3ds/challenge/${challengeId}/complete`,
        { outcome },
        { headers: { Accept: 'application/json' } },
      )
      return toPaymentResult(paymentIntent)
    } catch (cause) {
      return {
        status: 'error',
        error: cause instanceof HttpError ? cause.payload : { message: '3-D Secure failed' },
      }
    }
  },
})
