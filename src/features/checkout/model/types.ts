import type { PaymentMethod } from '../../../entities/payment-method/models/types'
import type { IPlan } from '../../../entities/plan/model/types'

export interface ICheckoutFormValues {
  planId: IPlan['id'] | null
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
