import { http } from 'msw'
import { DEFAULT_OUTCOME, TEST_CARDS } from '../config'
import { idempotencyKeys, paymentIntents, plansById } from '../data'
import { networkDelay } from '../lib/delay'
import { error, invalidJson, json, notFound } from '../lib/respond'
import { invalidParam, missingParam, normalizeCardNumber, readJson } from '../lib/validation'
import type {
  ConfirmPaymentIntentRequest,
  CreatePaymentIntentRequest,
  NextAction,
  PaymentIntent,
  PaymentIntentStatus,
} from '../types'
import { createChallenge } from './three-ds'

const TERMINAL: PaymentIntentStatus[] = ['succeeded', 'canceled', 'declined']

const isTerminal = (status: PaymentIntentStatus) => TERMINAL.includes(status)

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`

const buildIntent = ({ amount, currency }: { amount: number; currency: string }): PaymentIntent => {
  const id = newId('pi')

  return {
    id,
    object: 'payment_intent',
    amount,
    currency,
    status: 'requires_payment_method',
    clientSecret: `${id}_secret_${crypto.randomUUID().replace(/-/g, '')}`,
    livemode: false,
    created: Math.floor(Date.now() / 1000),
    nextAction: null,
    error: null,
  }
}

const save = (intent: PaymentIntent): PaymentIntent => {
  paymentIntents.set(intent.id, intent)
  return intent
}

const transitionTo = (intent: PaymentIntent, status: PaymentIntentStatus): PaymentIntent =>
  save({ ...intent, status, nextAction: null, error: null })

export const paymentIntentHandlers = [
  http.post('/api/payment-intents', async ({ request }) => {
    await networkDelay()

    const idempotencyKey = request.headers.get('Idempotency-Key')
    if (idempotencyKey) {
      const existingId = idempotencyKeys.get(idempotencyKey)
      const existing = existingId ? paymentIntents.get(existingId) : undefined
      if (existing) return json(existing)
    }

    const body = await readJson<Partial<CreatePaymentIntentRequest>>(request)
    if (!body) return invalidJson()

    // The client sends only a planId; the price is resolved server-side so it can
    // never be tampered with in the request.
    if (!body.planId) return error(400, missingParam('planId'))
    const plan = plansById.get(body.planId)
    if (!plan) return error(422, invalidParam('planId', 'Unknown plan.'))

    const intent = save(buildIntent({ amount: plan.amount, currency: plan.currency }))
    if (idempotencyKey) idempotencyKeys.set(idempotencyKey, intent.id)

    return json(intent, { status: 201 })
  }),

  http.get('/api/payment-intents/:id', async ({ params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('payment intent')

    return json(intent)
  }),

  http.post('/api/payment-intents/:id/confirm', async ({ request, params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('payment intent')

    if (isTerminal(intent.status) || intent.status === 'requires_action') {
      return error(400, {
        type: 'invalid_request_error',
        code: 'payment_intent_unexpected_state',
        message: `Payment intent is already in status '${intent.status}'.`,
      })
    }

    const body = await readJson<Partial<ConfirmPaymentIntentRequest>>(request)
    if (!body) return invalidJson()
    if (!body.cardNumber) return error(400, missingParam('cardNumber'))

    const outcome = TEST_CARDS[normalizeCardNumber(body.cardNumber)] ?? DEFAULT_OUTCOME

    switch (outcome.type) {
      case 'chaos':
        return error(503, {
          type: 'api_error',
          message: 'The payment provider is temporarily unavailable. Please retry.',
        })

      case 'succeed':
        return json(transitionTo(intent, 'succeeded'))

      case 'processing':
        return json(transitionTo(intent, 'processing'))

      case 'decline':
        return json(
          save({
            ...intent,
            status: 'declined',
            nextAction: null,
            error: { type: 'card_error', code: outcome.code, message: outcome.message },
          }),
        )

      case 'requires_action': {
        const challenge = createChallenge(intent.id, outcome.threeDS)
        const nextAction: NextAction = {
          type: 'redirect_to_url',
          three_d_secure: {
            challengeId: challenge.id,
            url: `/api/3ds/challenge/${challenge.id}`,
            status: 'pending',
          },
        }

        return json(save({ ...intent, status: 'requires_action', nextAction, error: null }))
      }
    }
  }),

  http.post('/api/payment-intents/:id/cancel', async ({ params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('payment intent')

    if (isTerminal(intent.status)) {
      return error(400, {
        type: 'invalid_request_error',
        code: 'payment_intent_unexpected_state',
        message: `Payment intent is already in status '${intent.status}'.`,
      })
    }

    return json(transitionTo(intent, 'canceled'))
  }),
]
