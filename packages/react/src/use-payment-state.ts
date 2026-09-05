import { PHASE_TO_UI_STATE, type PaymentUiState } from '@checkout-kit/core'
import { useCheckoutSnapshot } from './use-checkout'

export interface PaymentStateInput {
  /** The shopper has started filling the form in. */
  readonly isDirty?: boolean
  /**
   * A check is running that has not finished. With a synchronous validator this is never
   * true; it is here for the asynchronous ones - a BIN lookup, an address check.
   */
  readonly isValidating?: boolean
}

/**
 * What the checkout should be showing. The engine supplies seven of the nine states; the
 * other two are about the form, which the engine has no view of.
 */
export const usePaymentState = (input: PaymentStateInput = {}): PaymentUiState => {
  const state = PHASE_TO_UI_STATE[useCheckoutSnapshot().phase]

  if (state !== 'idle') return state
  if (input.isValidating) return 'validating'
  return input.isDirty ? 'editing' : 'idle'
}
