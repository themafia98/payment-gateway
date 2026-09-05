// One card, one outcome, three facades.
//
// The hosted page, the wallet and the field frame all authenticate out of our sight: by
// the time they hand anything back, the bank has already decided. So unlike the card APIs,
// they never return "requires_action" - a card that fails authentication comes back
// declined.

import { DEFAULT_OUTCOME, TEST_CARDS } from '../../test-cards'
import { PROCESSING_SETTLE_MS } from '../config'
import { saveIntent, scheduleSettlement } from '../data'
import type { PaymentIntent } from '../types'

export const settleByCard = (intent: PaymentIntent, cardNumber: string): PaymentIntent => {
  const outcome = TEST_CARDS[cardNumber] ?? DEFAULT_OUTCOME
  const settled = { ...intent, nextAction: null, error: null }

  switch (outcome.type) {
    case 'succeed':
      return saveIntent({ ...settled, status: 'succeeded' })

    case 'requires_action':
      return outcome.threeDS === 'pass'
        ? saveIntent({ ...settled, status: 'succeeded' })
        : saveIntent({
            ...settled,
            status: 'declined',
            error: {
              type: 'card_error',
              code: 'authentication_failed',
              message: '3D Secure authentication failed.',
            },
          })

    case 'processing':
      scheduleSettlement(intent.id, Date.now() + PROCESSING_SETTLE_MS)
      return saveIntent({ ...settled, status: 'processing' })

    case 'decline':
      return saveIntent({
        ...settled,
        status: 'declined',
        error: { type: 'card_error', code: outcome.code, message: outcome.message },
      })

    case 'chaos':
      return saveIntent({
        ...settled,
        status: 'declined',
        error: {
          type: 'api_error',
          code: 'processing_error',
          message: 'The payment could not be processed.',
        },
      })
  }
}
