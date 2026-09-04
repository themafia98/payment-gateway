// Domain types — the payment vocabulary the app uses. Imports nothing outward
// (no react/fetch/mocks). The backend DTO (src/mocks/types.ts) is a different wire
// shape; the adapter maps DTO -> these, so the wire format never leaks in.

/** Possible states of a payment intent. */
export type PaymentStatus =
  | 'requires_payment_method'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'declined'
  | 'canceled'

/** Domain payment error (stripped of transport details). */
export interface PaymentError {
  code?: string
  message: string
}

/** A request for extra confirmation (3-D Secure). */
export interface ThreeDSecureChallenge {
  challengeId: string
  url: string
}

export type ThreeDSecureAction = {
  challengeId: string
  url: string
  status: 'pending' | 'succeeded' | 'failed'
}

export type NextAction = {
  type: 'redirect_to_url'
  three_d_secure: ThreeDSecureAction
}

/** A payment intent in domain form. */
export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  nextAction?: NextAction | null
}

// Discriminated union on `status` — the UI switches on it. No UI concerns
// (loading/redirect) live here; that's the outer layer's job.
export type PaymentResult =
  | { status: 'succeeded'; intent: PaymentIntent }
  | { status: 'requires_action'; intent: PaymentIntent; challenge: ThreeDSecureChallenge }
  | { status: 'declined'; intent: PaymentIntent; error: PaymentError }
  | { status: 'error'; error: PaymentError }
