import { describeProviderContract } from '@checkout-kit/conformance'
import { transferHandlers } from '@checkout-kit/testing/backend'
import { SCENARIO_CARDS, declineMessage } from '@checkout-kit/testing'
import { bankTransferProvider, type BankTransferConfig } from './provider'

// The fifth shape of integration, and the one the contract was least obviously ready for:
// the payment finishes in an app this page cannot see. It needed no new case here - the
// action loop is the same, and the evidence just says "polling saw it settle".

const config: BankTransferConfig = {
  baseUrl: 'http://payments.test/api',
  poll: { intervalMs: 10, timeoutMs: 500 },
}

/** The shopper paying the code in their banking app. */
const payInTheBankApp = async (orderId: string, cardNumber: string): Promise<void> => {
  await fetch(`${config.baseUrl}/transfer/orders/${orderId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardNumber }),
  })
}

describeProviderContract({
  provider: bankTransferProvider,
  config,
  handlers: transferHandlers,
  declineMessage: declineMessage(),
  secrets: Object.values(SCENARIO_CARDS),

  instrumentFor: () => ({ kind: 'none' }),

  evidenceFor: async (action, testCase) => {
    await payInTheBankApp(action.id, SCENARIO_CARDS[testCase])

    // What the engine's polling produces once the provider stops saying "not yet".
    return { via: 'poll', actionId: action.id }
  },
})
