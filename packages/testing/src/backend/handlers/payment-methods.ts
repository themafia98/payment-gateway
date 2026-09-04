import { http } from 'msw'
import type { HttpHandler } from 'msw'
import { paymentMethods } from '../data'
import { networkDelay } from '../lib/delay'
import { json } from '../lib/respond'

export const paymentMethodHandlers: HttpHandler[] = [
  http.get('*/api/payment-methods', async () => {
    await networkDelay()
    return json(paymentMethods)
  }),
]
