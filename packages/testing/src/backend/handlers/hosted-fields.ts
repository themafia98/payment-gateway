// A fourth facade, for tokenized card fields. One endpoint turns a card into a token - in
// production it is called by the provider's frame, never by the merchant - and another
// charges that token.

import { http } from 'msw'
import type { HttpHandler } from 'msw'
import {
  consumeToken,
  idempotencyKeys,
  paymentIntents,
  plansById,
  rememberIdempotencyKey,
  rememberToken,
  saveIntent,
} from '../data'
import { networkDelay } from '../lib/delay'
import { settleByCard } from '../lib/settle-by-card'
import { json, notFound } from '../lib/respond'
import { invalidParam, normalizeCardNumber, readJson } from '../lib/validation'
import type { PaymentIntent, PaymentIntentStatus } from '../types'

const transitionTo = (intent: PaymentIntent, status: PaymentIntentStatus): PaymentIntent =>
  saveIntent({ ...intent, status, nextAction: null, error: null })

export const hostedFieldsHandlers: HttpHandler[] = [
  http.post('*/api/hosted-fields/charges', async ({ request }) => {
    await networkDelay()

    const body = await readJson<{ planId?: string }>(request)
    const plan = plansById.get(body?.planId ?? '')
    if (!plan) return json(invalidParam('planId', 'Unknown plan.'), { status: 422 })

    const idempotencyKey = request.headers.get('Idempotency-Key')
    const existingId = idempotencyKey ? idempotencyKeys.get(idempotencyKey) : undefined
    const existing = existingId ? paymentIntents.get(existingId) : undefined
    if (existing) return json(existing)

    const intent: PaymentIntent = {
      id: `hfc_${crypto.randomUUID().replace(/-/g, '')}`,
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

  /** Called by the field frame, never by the merchant. The card stops here. */
  http.post('*/api/hosted-fields/tokens', async ({ request }) => {
    await networkDelay()

    const body = await readJson<{ cardNumber?: string }>(request)
    const cardNumber = normalizeCardNumber(body?.cardNumber ?? '')
    if (!cardNumber)
      return json(invalidParam('cardNumber', 'Card number is required.'), { status: 422 })

    const token = `tok_${crypto.randomUUID().replace(/-/g, '')}`
    rememberToken(token, cardNumber)

    // Only ever the token and the last four. Nothing else leaves.
    return json({ token, last4: cardNumber.slice(-4) }, { status: 201 })
  }),

  http.post('*/api/hosted-fields/charges/:id/pay', async ({ request, params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('charge')

    const body = await readJson<{ token?: string }>(request)
    const cardNumber = consumeToken(body?.token ?? '')
    if (!cardNumber) return json(invalidParam('token', 'Unknown or used token.'), { status: 422 })

    return json(settleByCard(intent, cardNumber))
  }),

  http.get('*/api/hosted-fields/charges/:id', async ({ params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('charge')

    return json(intent)
  }),

  http.post('*/api/hosted-fields/charges/:id/cancel', async ({ params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('charge')

    return json(transitionTo(intent, 'canceled'))
  }),
]
