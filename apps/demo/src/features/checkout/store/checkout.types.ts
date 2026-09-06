import type { PaymentUiState, ProviderCapabilities } from '@checkout-kit/core'
import type { PaymentAction, PaymentError, PaymentIntent } from '@/entities/payment'

export interface CheckoutState {
  /** What the screen should be showing. The kit vocabulary, so components need no mapping. */
  state: PaymentUiState
  /** What the chosen provider collects. Null until its plugin has loaded. */
  capabilities: ProviderCapabilities | null
  intent: PaymentIntent | null
  action: PaymentAction | null
  error: PaymentError | null
  /** Nothing about the payment may be changed any more. */
  isLocked: boolean
}

export interface CheckoutActions {
  /**
   * Called by the engine bridge, never by a component. The store is a projection of the
   * engine, so this is the one way payment state gets in.
   */
  syncFromEngine(state: CheckoutState): void
}

export type CheckoutStore = CheckoutState & CheckoutActions
