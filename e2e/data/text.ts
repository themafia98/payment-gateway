export const PLACEHOLDERS = {
  cardNumber: '0000 0000 0000 0000',
  expiry: 'MM / YYYY',
  cvc: 'CVC',
  country: 'Country',
  postalCode: 'Postal code',
} as const

export const TEXT = {
  payButton: 'Continue payment',
  paymentSuccessful: 'Payment Successful!',
  paymentFailed: 'Payment Failed',
  transactionId: 'Transaction ID',
  challengeFrameTitle: '3-D Secure authentication',

  // Source of truth: TEST_CARDS['4000000000000002'].message in
  // src/shared/config/test-cards.ts. e2e cannot import from src (tsconfig.app
  // includes only "src"), so the string is mirrored here.
  declinedMessage: 'Your card was declined.',
} as const

export const PLANS = {
  monthly: 'Monthly',
  yearly: 'Yearly',
} as const

export const ACS_ORIGIN = 'https://localhost:5100'
