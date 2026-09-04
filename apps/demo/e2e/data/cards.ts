import { SCENARIO_CARDS } from '@pg/testing'

// The card table lives in @pg/testing, next to the mock backend that interprets it, so a
// PAN and its meaning cannot drift apart. These aliases only give the specs shorter names.
export const CARDS = {
  success: SCENARIO_CARDS.approve,
  declined: SCENARIO_CARDS.decline,
  requiresAction: SCENARIO_CARDS.challengePass,
} as const

export const VALID_BILLING = {
  expiry: '12 / 2030',
  cvc: '123',
  country: 'US',
  postalCode: '12345',
} as const
