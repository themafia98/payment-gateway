import type { PaymentUiState } from '@checkout-kit/core'

export interface PaymentStatusMessages {
  readonly submitting: string
  readonly processing: string
  readonly requires_action: string
  readonly success: string
  readonly failure: string
  readonly cancelled: string
}

/** English defaults. Every component that shows one takes an override. */
export const PAYMENT_STATUS_MESSAGES: PaymentStatusMessages = {
  submitting: 'Sending your payment',
  processing: 'Confirming your payment',
  requires_action: 'Waiting for your bank',
  success: 'Payment approved',
  failure: 'Payment failed',
  cancelled: 'Payment cancelled',
}

/** States that have nothing to announce: the shopper is still filling the form in. */
export const SILENT_STATES: readonly PaymentUiState[] = ['idle', 'editing', 'validating']
