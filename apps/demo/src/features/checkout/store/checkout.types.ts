import type { PaymentAction, PaymentError, PaymentIntent } from '@/entities/payment'
import type { PaymentMethod } from '@/entities/payment-method'

export type CheckoutStatus =
  | 'idle'
  | 'processing'
  | 'requires_action'
  | 'authenticating'
  | 'succeeded'
  | 'declined'
  | 'canceled'
  | 'error'

export interface CheckoutState {
  status: CheckoutStatus
  intent: PaymentIntent | null
  action: PaymentAction | null
  error: PaymentError | null
  /**
   * Which tab the shopper picked. The only field the engine knows nothing about: it is a
   * label this app shows on the receipt, not something a provider is told.
   */
  method: PaymentMethod | null
}

export interface CheckoutActions {
  setMethod(method: PaymentMethod): void
  /**
   * Called by the engine bridge, never by a component. The store is a projection of the
   * engine, so this is the one way payment state gets in.
   */
  syncFromEngine(state: Omit<CheckoutState, 'method'>): void
}

export type CheckoutStore = CheckoutState & CheckoutActions
