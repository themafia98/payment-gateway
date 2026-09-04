import type { Invoice } from '@/entities/invoice'
import type { Plan } from '@/entities/plan'

// The plan's price is what the backend will charge: the amount comes from the server, and
// the browser never recomputes it. A discount is therefore a saving *already reflected* in
// that price, not a deduction still to be made - so the total equals the price, and the
// line is labelled to say so rather than looking like arithmetic the page forgot to do.
export const toInvoice = (plan: Plan): Invoice => ({
  subtotal: plan.priceNumeric,
  discount: plan.discount,
  total: plan.priceNumeric,
  currency: plan.currency,
})
