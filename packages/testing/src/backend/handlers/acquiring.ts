// A second facade over the same bank, in the shape acquirers actually ship.
//
// Everything about the wire is different from the PSP API next door: form-urlencoded
// bodies, credentials repeated in every call, numeric statuses, ISO-4217 numeric currency
// codes, two round trips to start a payment, and - the part that catches everyone out -
// business failures returned as HTTP 200 with a non-zero `errorCode`.
//
// What is *not* different is the money. `register.do` writes into the same intent store
// the PSP facade uses, and `getOrderStatusExtended.do` projects the same status rather
// than keeping its own. A payment made through one facade is visible through the other,
// which is what makes this a second protocol rather than a second system.

import { http } from 'msw'
import type { HttpHandler } from 'msw'
import { DEFAULT_OUTCOME, TEST_CARDS } from '../../test-cards'
import {
  clearSettlement,
  idempotencyKeys,
  paymentIntents,
  plansById,
  processingSettlesAt,
  rememberIdempotencyKey,
  saveIntent,
  scheduleSettlement,
  threeDSChallenges,
} from '../data'
import { PROCESSING_SETTLE_MS } from '../config'
import { createChallenge, settleIntent } from '../lib/challenges'
import { networkDelay } from '../lib/delay'
import { field, readForm } from '../lib/form'
import { json } from '../lib/respond'
import { normalizeCardNumber } from '../lib/validation'
import type { PaymentIntent, PaymentIntentStatus } from '../types'

const USER_NAME = 'demo-api'
const PASSWORD = 'demo'

/** ISO-4217 numeric codes, because this API has never heard of "USD". */
const CURRENCY_NUMBERS: Record<string, string> = { USD: '840', EUR: '978', GBP: '826' }

/**
 * The bank's order statuses. Two of them collapse on the way into the domain - there is no
 * `authorized` and no `refunded` in a checkout that shows neither - and losing them here
 * is the right outcome: the port speaks the domain's vocabulary, not the bank's.
 */
const ORDER_STATUS: Record<PaymentIntentStatus, number> = {
  requires_payment_method: 0,
  processing: 1,
  succeeded: 2,
  canceled: 3,
  requires_action: 5,
  declined: 6,
}

/** Decline reasons, in the numeric form this API reports them. */
const ACTION_CODES: Record<string, number> = {
  generic_decline: 105,
  insufficient_funds: 116,
  expired_card: 101,
  incorrect_cvc: 119,
  authentication_failed: 110,
}

/** Only a protocol-level failure. A refused card is a successful call with orderStatus 6. */
const bankError = (code: string, message: string) =>
  json({ errorCode: code, errorMessage: message })

const ok = (payload: Record<string, unknown> = {}) => json({ errorCode: '0', ...payload })

const authenticated = (form: URLSearchParams): boolean =>
  field(form, 'userName') === USER_NAME && field(form, 'password') === PASSWORD

const transitionTo = (intent: PaymentIntent, status: PaymentIntentStatus): PaymentIntent =>
  saveIntent({ ...intent, status, nextAction: null, error: null })

const settleIfDue = (intent: PaymentIntent): PaymentIntent => {
  const due = processingSettlesAt.get(intent.id)
  if (intent.status !== 'processing' || due === undefined || Date.now() < due) return intent

  clearSettlement(intent.id)
  return transitionTo(intent, 'succeeded')
}

const orderId = () => crypto.randomUUID()

export const acquiringHandlers: HttpHandler[] = [
  // Step one of two: the order exists before anyone has seen a card.
  http.post('*/acquiring/rest/register.do', async ({ request }) => {
    await networkDelay()
    const form = await readForm(request)

    if (!authenticated(form)) return bankError('5', 'Access denied.')

    const planId = field(form, 'planId')
    const plan = plansById.get(planId)
    if (!plan) return bankError('1', 'Unknown plan.')

    // `orderNumber` is this API's idempotency key: it travels in the body, not a header,
    // and re-registering the same one returns the original order.
    const orderNumber = field(form, 'orderNumber')
    const existingId = orderNumber ? idempotencyKeys.get(orderNumber) : undefined
    const existing = existingId ? paymentIntents.get(existingId) : undefined
    if (existing) return ok({ orderId: existing.id, formUrl: `/acquiring/pay/${existing.id}` })

    const intent: PaymentIntent = {
      id: orderId(),
      object: 'payment_intent',
      amount: plan.amount,
      currency: plan.currency,
      status: 'requires_payment_method',
      clientSecret: `${orderId()}_secret`,
      livemode: false,
      created: Math.floor(Date.now() / 1000),
      nextAction: null,
      error: null,
    }
    saveIntent(intent)
    if (orderNumber) rememberIdempotencyKey(orderNumber, intent.id)

    return ok({ orderId: intent.id, formUrl: `/acquiring/pay/${intent.id}` })
  }),

  // Step two: the card itself, in fields named the way this API has always named them.
  http.post('*/acquiring/rest/paymentorder.do', async ({ request }) => {
    await networkDelay()
    const form = await readForm(request)

    if (!authenticated(form)) return bankError('5', 'Access denied.')

    const intent = paymentIntents.get(field(form, 'MDORDER'))
    if (!intent) return bankError('6', 'Order not found.')
    if (intent.status !== 'requires_payment_method') {
      return bankError('7', `Order is already in state ${ORDER_STATUS[intent.status]}.`)
    }

    const outcome = TEST_CARDS[normalizeCardNumber(field(form, '$PAN'))] ?? DEFAULT_OUTCOME

    switch (outcome.type) {
      case 'chaos':
        // A technical failure, and the only kind that gets a non-zero code.
        return bankError('9', 'Acquirer temporarily unavailable.')

      case 'succeed':
        transitionTo(intent, 'succeeded')
        return ok({ info: 'Payment processed' })

      case 'processing':
        scheduleSettlement(intent.id, Date.now() + PROCESSING_SETTLE_MS)
        transitionTo(intent, 'processing')
        return ok({ info: 'Payment accepted' })

      case 'decline':
        saveIntent({
          ...intent,
          status: 'declined',
          nextAction: null,
          error: { type: 'card_error', code: outcome.code, message: outcome.message },
        })
        // Note the shape: a refused card is a *successful* call. Reading `errorCode` as
        // "did the payment work" is the classic way to get this integration wrong.
        return ok({ info: 'Payment declined' })

      case 'requires_action': {
        const challenge = createChallenge(intent.id, outcome.threeDS)
        transitionTo(intent, 'requires_action')

        // 3-D Secure version 1: the bank hands back a form to post at its access control
        // server, not a challenge resource to fetch.
        return ok({
          acsUrl: '/acs/pareq',
          paReq: btoa(JSON.stringify({ challengeId: challenge.id, version: '1.0.2' })),
          MD: challenge.id,
        })
      }
    }
  }),

  http.post('*/acquiring/rest/getOrderStatusExtended.do', async ({ request }) => {
    await networkDelay()
    const form = await readForm(request)

    if (!authenticated(form)) return bankError('5', 'Access denied.')

    const stored = paymentIntents.get(field(form, 'orderId'))
    if (!stored) return bankError('6', 'Order not found.')

    // Projected from the shared status, never stored separately: the two facades cannot
    // disagree about a payment because there is only one of it.
    const intent = settleIfDue(stored)

    return ok({
      orderStatus: ORDER_STATUS[intent.status],
      actionCode: intent.error?.code ? (ACTION_CODES[intent.error.code] ?? 0) : 0,
      actionCodeDescription: intent.error?.message ?? '',
      amount: intent.amount,
      currency: CURRENCY_NUMBERS[intent.currency] ?? intent.currency,
      orderNumber: intent.id,
    })
  }),

  http.post('*/acquiring/rest/finish3ds.do', async ({ request }) => {
    await networkDelay()
    const form = await readForm(request)

    if (!authenticated(form)) return bankError('5', 'Access denied.')

    const challenge = threeDSChallenges.get(field(form, 'MD'))
    if (!challenge) return bankError('6', 'Authentication not found.')
    if (challenge.status !== 'pending') return bankError('7', 'Authentication already finished.')

    // The access control server has already checked the human; `PaRes` carries its verdict,
    // and as always the card has the final say on whether that verdict can be positive.
    const approved = challenge.outcome === 'pass' && field(form, 'PaRes').includes('"Y"')
    settleIntent(challenge, approved)

    return ok()
  }),

  http.post('*/acquiring/rest/reverse.do', async ({ request }) => {
    await networkDelay()
    const form = await readForm(request)

    if (!authenticated(form)) return bankError('5', 'Access denied.')

    const intent = paymentIntents.get(field(form, 'orderId'))
    if (!intent) return bankError('6', 'Order not found.')

    transitionTo(intent, 'canceled')
    return ok()
  }),
]
