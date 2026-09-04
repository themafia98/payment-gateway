// The outcome of a provider call. A discriminated union rather than a status string plus
// nullable fields, so every consumer is forced by the compiler to handle each case.

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
