/**
 * Public API of the `payment` entity (the slice's public API in FSD).
 *
 * Other layers import ONLY from here: `@/entities/payment`.
 * The internal layout (model/api) is an implementation detail and may change.
 */
export type {
  PaymentStatus,
  PaymentError,
  PaymentIntent,
  PaymentResult,
  ThreeDSecureChallenge,
} from './model/types'

export type { PaymentGateway, CreateIntentInput, CardInput } from './api/payment-gateway'

export { createHttpPaymentGatewayAdapter } from './api/http-payment-gateway.adapter'
