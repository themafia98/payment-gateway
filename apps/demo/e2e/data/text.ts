import { declineMessage } from '@pg/testing'

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
