import { describeProviderContract } from '@pg/conformance'
import { paymentIntentHandlers, threeDsHandlers } from '@pg/testing/backend'
import { SCENARIO_CARDS, declineMessage } from '@pg/testing'
import type { CardExpiration, CardNumber, CvcCode } from '@pg/core'
import { pspProvider, type PspConfig } from './provider'

const config: PspConfig = {
  // MSW matches the handlers' `*/api/...` patterns against an absolute URL in Node.
  baseUrl: 'http://payments.test/api',
  acsOrigin: 'https://acs.test',
}

const card = (number: string) => ({
  kind: 'card' as const,
  number: number as CardNumber,
  exp: '12/30' as CardExpiration,
  cvc: '123' as CvcCode,
})

describeProviderContract({
  provider: pspProvider,
  config,
  handlers: [...paymentIntentHandlers, ...threeDsHandlers],
  declineMessage: declineMessage(),

  instrumentFor: (testCase) => card(SCENARIO_CARDS[testCase]),

  // What the access control server posts back once the shopper has authenticated.
  evidenceFor: (action, outcome) => ({
    via: 'post_message',
    actionId: action.id,
    origin: config.acsOrigin,
    data: { type: '3ds-cres', challengeId: action.id, transStatus: outcome === 'pass' ? 'Y' : 'N' },
  }),
})
