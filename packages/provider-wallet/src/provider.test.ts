import { describeProviderContract } from '@checkout-kit/conformance'
import { walletHandlers } from '@checkout-kit/testing/backend'
import { SCENARIO_CARDS, declineMessage } from '@checkout-kit/testing'
import { walletProvider, type WalletConfig } from './provider'

// A wallet answers with a payload, not with a redirect and not with a form. The contract
// does not care: it is still one action, one piece of evidence, one outcome.

const config: WalletConfig = {
  baseUrl: 'http://payments.test/api',
  sdk: 'demo-wallet',
  scriptUrl: 'https://wallet.test/sdk.js',
  merchantName: 'Demo Store',
}

/** What the wallet sheet hands back. The mock token carries the card it stands for. */
const walletToken = (cardNumber: string) => `wlt_${cardNumber}`

describeProviderContract({
  provider: walletProvider,
  config,
  handlers: walletHandlers,
  declineMessage: declineMessage(),
  secrets: Object.values(SCENARIO_CARDS),

  instrumentFor: () => ({ kind: 'none' }),

  evidenceFor: (action, testCase) => ({
    via: 'sdk_callback',
    actionId: action.id,
    payload: { walletToken: walletToken(SCENARIO_CARDS[testCase]) },
  }),
})
