import type { CheckoutFormInput } from './schema'

export const formDefaultValues: CheckoutFormInput = {
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
