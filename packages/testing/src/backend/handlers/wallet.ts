// The wallet facade. Short, because a wallet is mostly someone else's screen.
//
// The token the wallet hands over stands for a card it already holds. Which card decides
// the outcome, exactly as it does in every other facade here - a wallet is a way of
// presenting a card, not a way of avoiding one.

import { http } from 'msw'
import type { HttpHandler } from 'msw'
import { DEFAULT_OUTCOME, TEST_CARDS } from '../../test-cards'
import { PROCESSING_SETTLE_MS } from '../config'
import {
  idempotencyKeys,
  paymentIntents,
  plansById,
  rememberIdempotencyKey,
  saveIntent,
  scheduleSettlement,
} from '../data'
import { networkDelay } from '../lib/delay'
import { json, notFound } from '../lib/respond'
import { invalidParam, normalizeCardNumber, readJson } from '../lib/validation'
import type { PaymentIntent, PaymentIntentStatus } from '../types'

const transitionTo = (intent: PaymentIntent, status: PaymentIntentStatus): PaymentIntent =>
  saveIntent({ ...intent, status, nextAction: null, error: null })

/**
 * Wallet tokens carry the card they stand for: `wlt_<pan>`.
 *
 * A real one is an encrypted blob only the network can open. This is a mock, and pretending
 * otherwise would add ceremony without adding truth.
 */
const cardBehind = (walletToken: string): string =>
  normalizeCardNumber(walletToken.replace(/^wlt_/, ''))

export const walletHandlers: HttpHandler[] = [
  http.post('*/api/wallet/charges', async ({ request }) => {
    await networkDelay()

    const body = await readJson<{ planId?: string }>(request)
    const plan = plansById.get(body?.planId ?? '')
    if (!plan) return json(invalidParam('planId', 'Unknown plan.'), { status: 422 })

    const idempotencyKey = request.headers.get('Idempotency-Key')
    const existingId = idempotencyKey ? idempotencyKeys.get(idempotencyKey) : undefined
    const existing = existingId ? paymentIntents.get(existingId) : undefined
    if (existing) return json(existing)

    const intent: PaymentIntent = {
      id: `wch_${crypto.randomUUID().replace(/-/g, '')}`,
      object: 'payment_intent',
      amount: plan.amount,
      currency: plan.currency,
      status: 'requires_payment_method',
      clientSecret: `${crypto.randomUUID()}_secret`,
      livemode: false,
      created: Math.floor(Date.now() / 1000),
      nextAction: null,
      error: null,
    }
    saveIntent(intent)
    if (idempotencyKey) rememberIdempotencyKey(idempotencyKey, intent.id)

    return json(intent, { status: 201 })
  }),

  http.get('*/api/wallet/charges/:id', async ({ params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('charge')

    return json(intent)
  }),

  http.post('*/api/wallet/charges/:id/pay', async ({ request, params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('charge')

    const body = await readJson<{ walletToken?: string }>(request)
    if (!body?.walletToken) {
      return json(invalidParam('walletToken', 'A wallet token is required.'), { status: 422 })
    }

    const outcome = TEST_CARDS[cardBehind(body.walletToken)] ?? DEFAULT_OUTCOME

    switch (outcome.type) {
      case 'succeed':
      // A wallet has already authenticated the shopper on the device; the bank does not
      // ask again.
      case 'requires_action':
        return json(transitionTo(intent, 'succeeded'))

      case 'processing':
        scheduleSettlement(intent.id, Date.now() + PROCESSING_SETTLE_MS)
        return json(transitionTo(intent, 'processing'))

      case 'chaos':
      case 'decline':
        return json(
          saveIntent({
            ...intent,
            status: 'declined',
            nextAction: null,
            error:
              outcome.type === 'decline'
                ? { type: 'card_error', code: outcome.code, message: outcome.message }
                : {
                    type: 'api_error',
                    code: 'processing_error',
                    message: 'The payment could not be processed.',
                  },
          }),
        )
    }
  }),

  http.post('*/api/wallet/charges/:id/cancel', async ({ params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('charge')

    return json(transitionTo(intent, 'canceled'))
  }),
]
