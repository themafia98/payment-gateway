// The payment as the domain sees it. Each plugin maps its provider's own status names
// onto this.

import type { PaymentAction } from './action'

export type PaymentStatus =
  | 'requires_payment_method'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'declined'
  | 'canceled'

/**
 * A failure expressed as data, never as a thrown class. Classes do not survive a package
 * boundary reliably - `instanceof` breaks across duplicate copies - so callers branch on
 * `code`, which does.
 */
export interface PaymentError {
  code?: string
  message: string
  /** Provider-specific detail, kept for logs and support - never for control flow. */
  detail?: Readonly<Record<string, unknown>>
}

export interface PaymentIntent {
  readonly id: string
  /** Minor units, as every payment API on earth reports them. */
  readonly amount: number
  readonly currency: string
  readonly status: PaymentStatus
  /**
   * Which plugin owns this intent. Required, because after a full-page redirect the only
   * way back into the right provider is what was persisted alongside the intent id.
   */
  readonly providerId: string
  readonly action?: PaymentAction | null
}

export interface CreateIntentInput {
  readonly planId: string
  readonly amount?: number
  readonly currency?: string
  readonly metadata?: Readonly<Record<string, string>>
}
