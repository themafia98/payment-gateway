/**
 * LAYER: Entities (domain) — the very center of Clean Architecture.
 *
 * Dependency rule: this file imports NOTHING outward.
 * No `react`, no `fetch`, no `@tanstack/*`, no `src/mocks/*`.
 * It holds only the "language of the domain" — how the frontend thinks of a payment.
 *
 * Note: this is NOT the same as the backend DTO (see `src/mocks/types.ts`).
 * A DTO is the wire format. The domain is the shape convenient for us.
 * The DTO -> domain translation is done by the ADAPTER (`../api/http-payment-gateway.adapter.ts`),
 * so the backend's wire format does not leak across the whole app.
 */

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

/**
 * Result of the payment use-case — a discriminated union on the `status` field.
 * UI/store do `switch (result.status)` and decide where to navigate.
 * Note: there are NO fields like `isLoading` or `redirect()` here — that is the
 * concern of the outer layer (store/UI), not the domain.
 */
export type PaymentResult =
  | { status: 'succeeded'; intent: PaymentIntent }
  | { status: 'requires_action'; intent: PaymentIntent; challenge: ThreeDSecureChallenge }
  | { status: 'declined'; intent: PaymentIntent; error: PaymentError }
  | { status: 'error'; error: PaymentError }
