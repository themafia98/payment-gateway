import type { PaymentGateway, PaymentResult } from '@/entities/payment'
import type { CheckoutFormSchema } from './schema'
import { plans } from '@/features/checkout/model/plans-fixture.ts'

// Payment use-case: create intent -> confirm -> return the result. Depends only on
// the injected PaymentGateway port — no fetch, no navigation — so it's testable
// without React or the network. The caller decides where to go from the result.
export const createPayCheckout =
  (gateway: PaymentGateway) =>
  async (form: CheckoutFormSchema): Promise<PaymentResult> => {
    const currentPlan = plans.find((plan) => plan.id === form.planId)

    if (!currentPlan) {
      throw new Error(`Plan with id ${form.planId} not found`)
    }

    const intent = await gateway.createIntent({
      amount: currentPlan.priceNumeric,
      currency: currentPlan.currencyISO,
    })

    return await gateway.confirm(intent.id, {
      number: form.card.number,
      exp: form.card.exp,
      cvc: form.card.cvc,
    })
  }
