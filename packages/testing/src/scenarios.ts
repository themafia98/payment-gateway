// Named cases, so a test can say what it is exercising instead of quoting a PAN.
//
// This is the seam that lets one spec run against every provider: each integration maps
// these same scenarios onto its own wire format, and the expected outcome is stated once,
// here, rather than mirrored into each test file.

import { TEST_CARDS, type CardOutcome } from './test-cards'

export type CardScenario =
  'approve' | 'decline' | 'challengePass' | 'challengeFail' | 'processing' | 'chaos'

export const SCENARIO_CARDS: Record<CardScenario, string> = {
  approve: '4242424242424242',
  decline: '4000000000000002',
  challengePass: '4000002500003155',
  challengeFail: '4000008400001629',
  processing: '4000000000009979',
  chaos: '4000000000000341',
}

export const outcomeOf = (scenario: CardScenario): CardOutcome => {
  const outcome = TEST_CARDS[SCENARIO_CARDS[scenario]]
  if (!outcome) throw new Error(`No test card registered for scenario "${scenario}".`)
  return outcome
}

/**
 * The message the issuer returns for a declined card. Tests assert on it verbatim, which
 * is how a provider reporting its own wording instead of the issuer's gets caught.
 */
export const declineMessage = (scenario: CardScenario = 'decline'): string => {
  const outcome = outcomeOf(scenario)
  if (outcome.type !== 'decline') {
    throw new Error(`Scenario "${scenario}" is not a decline.`)
  }
  return outcome.message
}
