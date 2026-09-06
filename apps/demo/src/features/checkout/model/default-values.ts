import type { CheckoutFormInput } from './schema'

export const formDefaultValues: CheckoutFormInput = {
  // Filled from the catalogue once it loads; hard-coding an id couples the form to the
  // mock backend.
  planId: '',
  email: '',
  card: { number: '', exp: '', cvc: '', holder: '' },
  billing: { country: '', postalCode: '' },
}
