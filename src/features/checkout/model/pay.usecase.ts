import type { PaymentGateway, PaymentResult } from '@/entities/payment'
import type { CheckoutFormSchema } from './schema'

// Payment use-case: create intent -> confirm -> return the result. Depends only on
// the injected PaymentGateway port — no fetch, no navigation — so it's testable
// without React or the network. The price is resolved server-side from planId; the
// client never sends an amount.
export const createPayCheckout =
  (gateway: PaymentGateway) =>
  async (form: CheckoutFormSchema): Promise<PaymentResult> => {
    const intent = await gateway.createIntent({ planId: form.planId })

    return await gateway.confirm(intent.id, {
      number: form.card.number,
      exp: form.card.exp,
      cvc: form.card.cvc,
    })
  }
