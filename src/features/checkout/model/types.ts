import type { PaymentMethod } from '@/entities/payment-method'
import type { Plan } from '@/entities/plan'

export interface ICheckoutFormValues {
  planId: Plan['id'] | null
  paymentMethod: PaymentMethod | null
  card: {
    number: number | null
    exp: string | null
    cvc: string | null
  }
  billing: {
    country: string | null
    postalCode: string | null
  }
}
