import type { PaymentGateway, PaymentResult } from '@/entities/payment'
import type { CheckoutFormSchema } from './schema'
import { plans } from '@/features/checkout/model/plans-fixture.ts'

/**
 * LAYER: Use Case (application scenario) — the second ring of Clean Architecture.
 *
 * Orchestrates the payment steps: create intent -> confirm -> return the result.
 * Depends ONLY on the `PaymentGateway` port interface, not on a concrete adapter
 * (fetch/axios). The port comes in as a parameter — that is Dependency Injection.
 *
 * What is DELIBERATELY NOT here and why:
 *   - navigate(...)   — navigation is a "delivery" detail. Lives in the UI.
 *   - useState/loading — UI state. Lives in the zustand store.
 *   - fetch/URL       — a transport detail. Lives in the adapter.
 * The use-case returns a clean `PaymentResult`, and the decision "where to go" is
 * made by the outer layer (store/form). So the scenario is testable without React
 * and without the network.
 *
 * COMPOSITION ROOT: somewhere the dependency graph is assembled ONCE, e.g. in the
 * zustand store (that part is yours to write):
 *
 *   const gateway = createHttpPaymentGatewayAdapter()   // pick a concrete adapter
 *   const pay = createPayCheckout(gateway)          // inject it into the scenario
 *   const result = await pay(formValues)            // run the scenario
 *   // then: switch (result.status) -> navigate(...)  // this is UI/store already
 *
 */
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
