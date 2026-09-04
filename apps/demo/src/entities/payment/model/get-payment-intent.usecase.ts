import type { PaymentGateway } from '../api/payment-gateway'
import type { PaymentIntent } from './types'

// Read an intent by id — the seam summary routes go through instead of reaching
// for a gateway themselves. After a reload the in-memory store is gone, so this
// is what the result pages fall back to.
export const createGetPaymentIntent =
  (gateway: PaymentGateway) =>
  (intentId: string): Promise<PaymentIntent> =>
    gateway.getIntent(intentId)
