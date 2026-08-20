export const LATENCY = { min: 150, max: 700 }

export const OTP_SUCCESS = '1234'

export type DeclineCode =
  'generic_decline' | 'insufficient_funds' | 'expired_card' | 'incorrect_cvc'

export type CardOutcome =
  | { type: 'succeed' }
  | { type: 'processing' }
  | { type: 'chaos' }
  | { type: 'decline'; code: DeclineCode; message: string }
  | { type: 'requires_action'; threeDS: 'pass' | 'fail' }

export const TEST_CARDS: Record<string, CardOutcome> = {
  '4242424242424242': { type: 'succeed' },
  '4000000000000002': {
    type: 'decline',
    code: 'generic_decline',
    message: 'Your card was declined.',
  },
  '4000000000009995': {
    type: 'decline',
    code: 'insufficient_funds',
    message: 'Your card has insufficient funds.',
  },
  '4000000000000069': {
    type: 'decline',
    code: 'expired_card',
    message: 'Your card has expired.',
  },
  '4000000000000127': {
    type: 'decline',
    code: 'incorrect_cvc',
    message: "Your card's security code is incorrect.",
  },
  '4000002500003155': { type: 'requires_action', threeDS: 'pass' },
  '4000008400001629': { type: 'requires_action', threeDS: 'fail' },
  '4000000000009979': { type: 'processing' },
  '4000000000000341': { type: 'chaos' },
}

export const DEFAULT_OUTCOME: CardOutcome = { type: 'succeed' }
