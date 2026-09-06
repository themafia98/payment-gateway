import { declineMessage } from '@checkout-kit/testing'

export const LABELS = {
  cardNumber: 'Card number',
  cardholder: 'Name on card',
  expiry: 'Expiry date',
  cvc: 'Security code',
  email: 'Email',
  country: 'Country',
  postalCode: 'Postal code',
} as const

export const TEXT = {
  payButton: 'Continue payment',
  paymentSuccessful: 'Payment successful',
  paymentFailed: 'Payment declined',
  transactionId: 'Transaction ID',
  challengeFrameTitle: '3-D Secure authentication',
  cancelChallenge: 'Cancel payment',

  // Read from the same table the backend answers with: a provider that reports its own
  // wording instead of the issuer's message fails here.
  declinedMessage: declineMessage(),
} as const

export const PLANS = {
  monthly: 'Monthly',
  yearly: 'Yearly',
} as const

export const ACS_ORIGIN = 'https://localhost:5100'
