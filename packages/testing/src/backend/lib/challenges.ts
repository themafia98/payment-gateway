// Authentication challenges, shared by every facade in front of this backend.
//
// The PSP API and the acquiring API present 3-D Secure completely differently - one as a
// challenge resource with a JSON verdict, the other as a `PaReq` posted to an access
// control server - but there is only ever one bank behind them, one store of challenges
// and one rule about what a passing code means. Keeping that here is what makes a payment
// started through one facade visible through the other.

import { paymentIntents, persistBackend, saveIntent, threeDSChallenges } from '../data'
import type { PaymentIntent, ThreeDSChallenge } from '../types'

const challengeId = () => `tdsc_${crypto.randomUUID().replace(/-/g, '')}`

export const createChallenge = (
  paymentIntentId: string,
  outcome: 'pass' | 'fail',
): ThreeDSChallenge => {
  const challenge: ThreeDSChallenge = {
    id: challengeId(),
    paymentIntentId,
    outcome,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  threeDSChallenges.set(challenge.id, challenge)
  persistBackend()

  return challenge
}

/**
 * Apply an authentication verdict to the payment behind it.
 *
 * The card decides the outcome, not the shopper: a card registered as `fail` cannot be
 * talked into approving, however correct the one-time code.
 */
export const settleIntent = (
  challenge: ThreeDSChallenge,
  approved: boolean,
): PaymentIntent | null => {
  const intent = paymentIntents.get(challenge.paymentIntentId)
  if (!intent) return null

  const updated: PaymentIntent = approved
    ? { ...intent, status: 'succeeded', nextAction: null, error: null }
    : {
        ...intent,
        status: 'declined',
        nextAction: null,
        error: {
          type: 'card_error',
          code: 'authentication_failed',
          message: '3D Secure authentication failed.',
        },
      }

  saveIntent(updated)
  challenge.status = approved ? 'succeeded' : 'failed'
  threeDSChallenges.set(challenge.id, challenge)
  persistBackend()

  return updated
}
