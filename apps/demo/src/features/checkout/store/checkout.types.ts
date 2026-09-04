import type {
  PaymentError,
  PaymentIntent,
  PaymentResult,
  ThreeDSecureChallenge,
} from '@/entities/payment'
import type { PaymentMethod } from '@/entities/payment-method'

export type CheckoutStatus =
  'idle' | 'processing' | 'requires_action' | 'authenticating' | 'succeeded' | 'declined' | 'error'

export interface CheckoutState {
  status: CheckoutStatus
  intent: PaymentIntent | null
  challenge: ThreeDSecureChallenge | null
  error: PaymentError | null
  method: PaymentMethod | null
}

export interface CheckoutActions {
  startPayment(method: PaymentMethod): void
  applyResult(result: PaymentResult): void
  startAuthentication(): void
  reset(): void
}

export type CheckoutStore = CheckoutState & CheckoutActions
