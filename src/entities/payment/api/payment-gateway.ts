import type { PaymentIntent, PaymentResult } from '../model/types'
import type { CardExpiration, CardNumber, CvcCode } from '@/shared/types'

// PaymentGateway port: the interface use-cases depend on. Swap the adapter (HTTP,
// or a fake for tests) without touching the domain or scenarios.

export interface CreateIntentInput {
  planId: string
}

// Card fields use branded types from @/shared/types (a lower layer). The port must
// not import from the checkout feature, though this matches CheckoutFormSchema['card'].
export interface CardInput {
  number: CardNumber
  exp: CardExpiration
  cvc: CvcCode
}

export interface PaymentGateway {
  /**
   * Create a payment intent. Mock: POST /api/payment-intents.
   * `idempotencyKey` tags the attempt so a retried request (lost response, auto-retry)
   * resolves to the same intent instead of creating a duplicate charge.
   */
  createIntent(input: CreateIntentInput, idempotencyKey: string): Promise<PaymentIntent>

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
