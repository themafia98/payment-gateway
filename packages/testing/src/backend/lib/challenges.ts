// Authentication challenges, shared by every facade. The two APIs present 3-D Secure very
// differently, but there is one bank behind them and one rule about a passing code.

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
