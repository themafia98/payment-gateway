import { PHASE_TO_UI_STATE, type PaymentUiState } from '@checkout-kit/core'
import { useCheckoutSnapshot } from './use-checkout'

export interface PaymentStateInput {
  /** The shopper has started filling the form in. */
  readonly isDirty?: boolean
  /** Never true with a synchronous validator; here for a BIN lookup or an address check. */
  readonly isValidating?: boolean
}

/** The engine supplies seven of the nine states; the other two are about the form. */
export const usePaymentState = (input: PaymentStateInput = {}): PaymentUiState => {
  const state = PHASE_TO_UI_STATE[useCheckoutSnapshot().phase]

  if (state !== 'idle') return state
  if (input.isValidating) return 'validating'
  return input.isDirty ? 'editing' : 'idle'
}
