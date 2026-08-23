import type { PaymentGateway, PaymentResult } from '@/entities/payment'
import type { CheckoutFormSchema } from './schema'

// Payment use-case: create intent -> confirm -> return the result. Depends only on
// the injected PaymentGateway port — no fetch, no navigation — so it's testable
// without React or the network. The caller decides where to go from the result.
export const createPayCheckout =
  (gateway: PaymentGateway) =>
  async (form: CheckoutFormSchema, idempotencyKey: string): Promise<PaymentResult> => {
    const intent = await gateway.createIntent({ planId: form.planId }, idempotencyKey)

    return await gateway.confirm(intent.id, {
      number: form.card.number,
      exp: form.card.exp,
      cvc: form.card.cvc,
    })
  }
