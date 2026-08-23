export const CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
  requiresAction: '4000002500003155',
} as const

export const VALID_BILLING = {
  expiry: '12 / 2030',
  cvc: '123',
  country: 'US',
  postalCode: '12345',
} as const
