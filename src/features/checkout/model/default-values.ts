import type { CheckoutFormSchema } from './schema'

export const formDefaultValues: CheckoutFormSchema = {
  planId: '1id',

  paymentMethod: 'Card',

  card: {
    number: '',
    exp: '',
    cvc: '',
  },

  billing: {
    country: '',
    postalCode: '',
  },
}
