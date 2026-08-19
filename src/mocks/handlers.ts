import { delay, http, HttpResponse } from 'msw'
import { merchantConfig, paymentIntents, paymentMethods } from './data'
import type {
  ConfirmPaymentIntentRequest,
  CreatePaymentIntentRequest,
  PaymentIntent,
  PaymentIntentStatus,
} from './types'

const MOCK_API_DELAY_MS = 500

const normalizeCardNumber = (cardNumber: string) => cardNumber.replace(/\D/g, '')

const getConfirmationResult = (cardNumber: string): Pick<PaymentIntent, 'status' | 'error'> => {
  const normalizedCardNumber = normalizeCardNumber(cardNumber)

  if (normalizedCardNumber === '4000000000000002') {
    return { status: 'declined', error: 'Your card was declined.' }
  }

  if (normalizedCardNumber === '4000002500003155') {
    return { status: 'requires_action' }
  }

  if (normalizedCardNumber === '4000000000009979') {
    return { status: 'processing' }
  }

  return { status: 'succeeded' }
}

const createPaymentIntent = ({ amount, currency }: CreatePaymentIntentRequest): PaymentIntent => {
  const id = `pi_${crypto.randomUUID()}`

  return {
    id,
    amount,
    currency,
    status: 'requires_payment_method',
    clientSecret: `${id}_secret_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
  }
}

const updatePaymentIntentStatus = (
  paymentIntent: PaymentIntent,
  status: PaymentIntentStatus,
  error?: string,
): PaymentIntent => ({
  ...paymentIntent,
  status,
  error,
})

export const handlers = [
  http.get('/api/merchant/config', async () => {
    await delay(MOCK_API_DELAY_MS)

    return HttpResponse.json(merchantConfig)
  }),

  http.get('/api/payment-methods', async () => {
    await delay(MOCK_API_DELAY_MS)

    return HttpResponse.json(paymentMethods)
  }),

  http.post('/api/payment-intents', async ({ request }) => {
    await delay(MOCK_API_DELAY_MS)

    const body = (await request.json()) as CreatePaymentIntentRequest
    const paymentIntent = createPaymentIntent(body)

    paymentIntents.set(paymentIntent.id, paymentIntent)

    return HttpResponse.json(paymentIntent, { status: 201 })
  }),

  http.get('/api/payment-intents/:id', async ({ params }) => {
    await delay(MOCK_API_DELAY_MS)

    const paymentIntent = paymentIntents.get(String(params.id))

    if (!paymentIntent) {
      return HttpResponse.json({ message: 'Payment intent not found.' }, { status: 404 })
    }

    return HttpResponse.json(paymentIntent)
  }),

  http.post('/api/payment-intents/:id/confirm', async ({ params, request }) => {
    await delay(MOCK_API_DELAY_MS)

    const paymentIntent = paymentIntents.get(String(params.id))

    if (!paymentIntent) {
      return HttpResponse.json({ message: 'Payment intent not found.' }, { status: 404 })
    }

    const body = (await request.json()) as ConfirmPaymentIntentRequest
    const result = getConfirmationResult(body.cardNumber)
    const updatedPaymentIntent = updatePaymentIntentStatus(
      paymentIntent,
      result.status,
      result.error,
    )

    paymentIntents.set(updatedPaymentIntent.id, updatedPaymentIntent)

    return HttpResponse.json(updatedPaymentIntent)
  }),

  http.post('/api/payment-intents/:id/cancel', async ({ params }) => {
    await delay(MOCK_API_DELAY_MS)

    const paymentIntent = paymentIntents.get(String(params.id))

    if (!paymentIntent) {
      return HttpResponse.json({ message: 'Payment intent not found.' }, { status: 404 })
    }

    const updatedPaymentIntent = updatePaymentIntentStatus(paymentIntent, 'canceled')

    paymentIntents.set(updatedPaymentIntent.id, updatedPaymentIntent)

    return HttpResponse.json(updatedPaymentIntent)
  }),
]
