import type { PaymentGateway, CreateIntentInput, CardInput } from './payment-gateway'
import type { PaymentIntent, PaymentResult, PaymentStatus } from '../model/types'
import { createHttpClient, type HttpClient, HttpError } from '@/shared/api'
import { normalizeCardNumber } from '@/shared/lib'

/**
 * Wire format (DTO) as the mock backend actually returns it (`src/mocks/types.ts`).
 * The adapter is ALLOWED to know this shape — it is the translator. We declare it
 * locally instead of importing from `src/mocks` so production code never depends on
 * test infrastructure.
 */
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

/**
 * LAYER: Adapter — driven/secondary in Hexagonal terms.
 *
 * This IS the adapter: `HttpPaymentGatewayAdapter`, the HTTP implementation of the
 * `PaymentGateway` port. File name (`*.adapter.ts`) and factory name make the role
 * explicit — the port is the interface, this is one concrete plug into it.
 *
 * It is the ONLY place that knows about URLs and the backend DTO format. It
 * IMPLEMENTS the `PaymentGateway` port on top of the shared `HttpClient` (which,
 * in turn, is the only thing that touches `fetch`). If the backend or the HTTP
 * library changes tomorrow, only this file / the client changes.
 *
 * The DTO -> domain mapping also lives here: the raw server response
 * (the shape from `src/mocks/types.ts`, e.g. `{ nextAction, error, ... }`) is
 * turned into a clean domain `PaymentResult` from `../model/types.ts`.
 * That way the wire format does NOT leak into the use-case and UI.
 *
 * IMPORTANT: the domain (`../model`) does NOT import this file. The dependency
 * arrow points HERE (adapter -> port -> domain), never the other way.
 *
 * The `http` client is injected (defaults to a real one) so the adapter can also
 * be unit-tested with a fake client.
 */

export const createHttpPaymentGatewayAdapter = (
  http: HttpClient = createHttpClient(),
): PaymentGateway => ({
  async createIntent(input: CreateIntentInput): Promise<PaymentIntent> {
    return http.post('/payment-intents', input)
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
