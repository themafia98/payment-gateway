import type { CheckoutFormSchema } from './schema'

export const formDefaultValues: CheckoutFormSchema = {
  planId: '1id',
  paymentMethod: 'Card',
  card: {
    number: null,
    exp: '',
    cvc: '',
  },
  billing: {
    country: '',
    postalCode: '',
  },
}
