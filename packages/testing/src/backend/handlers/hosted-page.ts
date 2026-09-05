// A third facade: the merchant never sees a card. The shopper pays on the bank's page and
// returns with query parameters, which is why the only endpoint that matters is the one
// that reads the order back.

import { http } from 'msw'
import type { HttpHandler } from 'msw'
import { DEFAULT_OUTCOME, TEST_CARDS } from '../../test-cards'
import { PROCESSING_SETTLE_MS } from '../config'
import {
  clearSettlement,
  idempotencyKeys,
  paymentIntents,
  plansById,
  processingSettlesAt,
  rememberIdempotencyKey,
  saveIntent,
  scheduleSettlement,
} from '../data'
import { networkDelay } from '../lib/delay'
import { field, readForm } from '../lib/form'
import { invalidJson, json, notFound } from '../lib/respond'
import { invalidParam, normalizeCardNumber, readJson } from '../lib/validation'
import type { PaymentIntent, PaymentIntentStatus } from '../types'

interface RegisterHostedOrderRequest {
  planId?: string
  returnUrl?: string
}

const transitionTo = (intent: PaymentIntent, status: PaymentIntentStatus): PaymentIntent =>
  saveIntent({ ...intent, status, nextAction: null, error: null })

export const hostedPageHandlers: HttpHandler[] = [
  http.post('*/api/hosted/orders', async ({ request }) => {
    await networkDelay()

    const body = await readJson<RegisterHostedOrderRequest>(request)
    if (!body) return invalidJson()

    const plan = plansById.get(body.planId ?? '')
    if (!plan) return json(invalidParam('planId', 'Unknown plan.'), { status: 422 })

    const idempotencyKey = request.headers.get('Idempotency-Key')
    const existingId = idempotencyKey ? idempotencyKeys.get(idempotencyKey) : undefined
    const existing = existingId ? paymentIntents.get(existingId) : undefined
    if (existing) return json({ orderId: existing.id })

    const intent: PaymentIntent = {
      id: `hpo_${crypto.randomUUID().replace(/-/g, '')}`,
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

    return json({ orderId: intent.id }, { status: 201 })
  }),

  /**
   * What the shopper's card did, according to the bank.
   *
   * This is the endpoint the plugin trusts, and the reason the query parameters on the
   * return URL can be safely ignored.
   */
  http.get('*/api/hosted/orders/:id', async ({ params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('order')

    const due = processingSettlesAt.get(intent.id)
    if (intent.status === 'processing' && due !== undefined && Date.now() >= due) {
      clearSettlement(intent.id)
      return json(transitionTo(intent, 'succeeded'))
    }

    return json(intent)
  }),

  /**
   * The bank's own payment form submitting. In a real integration this lives entirely on
   * the bank's side; here it stands in for it, so the demo can complete a payment without
   * a fourth server.
   */
  http.post('*/api/hosted/orders/:id/pay', async ({ request, params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('order')

    const form = await readForm(request)
    const outcome = TEST_CARDS[normalizeCardNumber(field(form, 'cardNumber'))] ?? DEFAULT_OUTCOME

    switch (outcome.type) {
      case 'succeed':
      case 'requires_action':
        // A hosted page handles its own authentication, out of sight; by the time the
        // shopper is sent back, the bank has already decided.
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
]
