import { describeProviderContract } from '@checkout-kit/conformance'
import { acquiringHandlers } from '@checkout-kit/testing/backend'
import { SCENARIO_CARDS, declineMessage } from '@checkout-kit/testing'
import type { CardExpiration, CardNumber, CvcCode } from '@checkout-kit/core'
import { acquiringProvider, type AcquiringConfig } from './provider'

// The same suite the PSP plugin passes, against a protocol that shares nothing with it:
// form bodies instead of JSON, credentials in every call, a refused card arriving as a
// successful HTTP 200. If a contract can hold across those two, it is a contract.

const config: AcquiringConfig = {
  baseUrl: 'http://acquirer.test/acquiring',
  userName: 'demo-api',
  password: 'demo',
  acsOrigin: 'https://acs.test',
}

const card = (number: string) => ({
  kind: 'card' as const,
  number: number as CardNumber,
  exp: '12 / 2030' as CardExpiration,
  cvc: '123' as CvcCode,
})

describeProviderContract({
  provider: acquiringProvider,
  config,
  handlers: acquiringHandlers,

  // The decline message is the issuer's, so it is identical to the PSP's - the shopper is
  // told the same thing whichever acquirer the merchant happens to be using today.
  declineMessage: declineMessage(),

  instrumentFor: (testCase) => card(SCENARIO_CARDS[testCase]),

  // 3-D Secure 1: the access control server posts back a PaRes rather than a CRes.
  evidenceFor: (action, testCase) => ({
    via: 'post_message',
    actionId: action.id,
    origin: config.acsOrigin,
    data: {
      type: '3ds-pares',
      MD: action.id,
      transStatus: testCase === 'challengeFail' ? 'N' : 'Y',
    },
  }),
})
