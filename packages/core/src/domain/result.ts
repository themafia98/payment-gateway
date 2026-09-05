// The outcome of a provider call, as a union, so every caller has to handle each case.

import type { PaymentAction } from './action'
import type { PaymentError, PaymentIntent } from './intent'

export type PaymentResult =
  | { status: 'succeeded'; intent: PaymentIntent }
  | { status: 'requires_action'; intent: PaymentIntent; action: PaymentAction }
  /** Accepted but not settled yet: the engine polls until it reaches a terminal status. */
  | { status: 'processing'; intent: PaymentIntent }
  | { status: 'declined'; intent: PaymentIntent; error: PaymentError }
  /** Something broke on our side or the provider's - not a decision about the card. */
  | { status: 'error'; error: PaymentError; intent?: PaymentIntent }

export const isTerminalResult = (result: PaymentResult): boolean =>
  result.status === 'succeeded' || result.status === 'declined' || result.status === 'error'
