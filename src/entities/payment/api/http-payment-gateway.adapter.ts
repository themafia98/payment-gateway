import type { PaymentGateway, CreateIntentInput, CardInput } from './payment-gateway'
import type { PaymentIntent, PaymentResult } from '../model/types'
import { createHttpClient, type HttpClient, HttpError } from '@/shared/api'
import { normalizeCardNumber } from '@/shared/lib'

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
})
