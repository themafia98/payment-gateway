// A fifth facade: instant bank transfer. The shopper is shown a code, pays it in their
// banking app, and this backend is told about it by the scheme - never by our page.
//
// PIX, UPI, BLIK and Poland's Blue Media all work like this. The only thing that differs
// is what the code looks like.

import { http } from 'msw'
import type { HttpHandler } from 'msw'
import {
  idempotencyKeys,
  paymentIntents,
  plansById,
  rememberIdempotencyKey,
  saveIntent,
} from '../data'
import { networkDelay } from '../lib/delay'
import { alreadySettled, json, notFound } from '../lib/respond'
import { settleByCard } from '../lib/settle-by-card'
import { invalidParam, normalizeCardNumber, readJson } from '../lib/validation'
import type { PaymentIntent, PaymentIntentStatus } from '../types'

const SETTLED: readonly PaymentIntentStatus[] = ['succeeded', 'declined', 'canceled']

/** The payload a banking app scans. The real ones are longer and carry a checksum. */
const payloadFor = (intent: PaymentIntent): string =>
  `00020126BR.DEMO.TRANSFER${intent.id.toUpperCase()}5204000053039865802BR`

export const transferHandlers: HttpHandler[] = [
  http.post('*/api/transfer/orders', async ({ request }) => {
    await networkDelay()

    const body = await readJson<{ planId?: string }>(request)
    const plan = plansById.get(body?.planId ?? '')
    if (!plan) return json(invalidParam('planId', 'Unknown plan.'), { status: 422 })

    const idempotencyKey = request.headers.get('Idempotency-Key')
    const existingId = idempotencyKey ? idempotencyKeys.get(idempotencyKey) : undefined
    const existing = existingId ? paymentIntents.get(existingId) : undefined
    if (existing) return json(existing)

    const intent: PaymentIntent = {
      id: `trf_${crypto.randomUUID().replace(/-/g, '')}`,
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

  /** Issues the code the shopper pays. Asking twice returns the same one. */
  http.post('*/api/transfer/orders/:id/code', async ({ params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('order')
    if (SETTLED.includes(intent.status)) return alreadySettled('order')

    const payload = payloadFor(intent)

    return json({
      order: intent,
      payload,
      // A real provider renders the QR itself and hands over a URL, which is why the kit
      // ships no QR encoder.
      qrImageUrl: `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#fff"/><rect x="1" y="1" width="2" height="2"/><rect x="5" y="1" width="2" height="2"/><rect x="1" y="5" width="2" height="2"/><rect x="4" y="4" width="1" height="1"/></svg>`,
      )}`,
      deeplink: `demobank://pay?code=${encodeURIComponent(payload)}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
  }),

  http.get('*/api/transfer/orders/:id', async ({ params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('order')

    return json(intent)
  }),

  /**
   * The shopper paying in their banking app. In production nothing on the merchant side
   * can call this - the scheme tells the acquirer, and the acquirer tells the merchant.
   */
  http.post('*/api/transfer/orders/:id/pay', async ({ request, params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('order')
    if (SETTLED.includes(intent.status)) return alreadySettled('order')

    // The card stands in for the account being debited, so one outcome table covers every
    // facade in this backend.
    const body = await readJson<{ cardNumber?: string }>(request)

    return json(settleByCard(intent, normalizeCardNumber(body?.cardNumber ?? '')))
  }),

  http.post('*/api/transfer/orders/:id/cancel', async ({ params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('order')

    return json(saveIntent({ ...intent, status: 'canceled', nextAction: null, error: null }))
  }),
]
