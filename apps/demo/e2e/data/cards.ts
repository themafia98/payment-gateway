import { SCENARIO_CARDS } from '@checkout-kit/testing'

// The card table lives in @checkout-kit/testing, next to the mock backend that interprets it, so a
// PAN and its meaning cannot drift apart. These aliases only give the specs shorter names.
export const CARDS = {
  success: SCENARIO_CARDS.approve,
  declined: SCENARIO_CARDS.decline,
  requiresAction: SCENARIO_CARDS.challengePass,
  processing: SCENARIO_CARDS.processing,
} as const

export const VALID_BILLING = {
  expiry: '12 / 30',
  cvc: '123',
  holder: 'Ada Lovelace',
  email: 'ada@example.com',
  country: 'US',
  postalCode: '12345',
} as const
