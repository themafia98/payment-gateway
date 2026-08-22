import type { PaymentIntent, PaymentResult } from '../model/types'
import type { CardExpiration, CardNumber, CvcCode } from '@/shared/types'

/**
 * LAYER: Port — in Hexagonal Architecture terms.
 *
 * This is JUST AN INTERFACE — a "hole in a side of the hexagon". No implementation here.
 *
 * Port kind: driven / secondary (we call outward — to the network).
 * Who depends on it: the use-case (`src/features/checkout/model/pay.usecase.ts`).
 * Who implements it: the adapter (`./http-payment-gateway.adapter.ts` over fetch, but it could
 * just as well be an axios adapter, a gRPC adapter, or a fake adapter for tests).
 *
 * POINT OF THE EXERCISE: the use-case depends on THIS contract, not on fetch.
 * So the core can be tested by injecting a fake port implementation, and the transport
 * can be swapped without touching the domain or the scenarios. This is Dependency
 * Inversion — "depend on an abstraction, not a detail".
 */

/** Input for creating an intent. Built by the use-case from form/plan data. */
export interface CreateIntentInput {
  amount: number
  currency: string
}

/**
 * Card data for confirmation. Built from branded types in `@/shared/lib`
 * (a lower layer — allowed), NOT from the checkout feature's form schema.
 * The port must not depend on a feature. Structurally it still matches
 * `CheckoutFormSchema['card']`, so the use-case passes `form.card` as is.
 */
export interface CardInput {
  number: CardNumber
  exp: CardExpiration
  cvc: CvcCode
}

export interface PaymentGateway {
  /** Create a payment intent. Mock: POST /api/payment-intents */
  createIntent(input: CreateIntentInput): Promise<PaymentIntent>

  /** Confirm an intent with a card. Mock: POST /api/payment-intents/:id/confirm */
  confirm(intentId: string, card: CardInput): Promise<PaymentResult>

  /** Cancel an intent. Mock: POST /api/payment-intents/:id/cancel */
  cancel(intentId: string): Promise<void>

  /**
   * Re-read an intent's current status (source of truth after a 3DS challenge).
   * Mock: GET /api/payment-intents/:id
   */
  getIntent(intentId: string): Promise<PaymentIntent>

  /**
   * Settle a 3-D Secure challenge and return the resulting payment status.
   * `outcome` is the ACS verdict (transStatus Y -> 'success', N -> 'fail').
   * Mock: POST /api/3ds/challenge/:challengeId/complete
   */
  authenticate(challengeId: string, outcome: 'success' | 'fail'): Promise<PaymentResult>
}
