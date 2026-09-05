import { describeProviderContract } from '@checkout-kit/conformance'
import { hostedPageHandlers } from '@checkout-kit/testing/backend'
import { SCENARIO_CARDS, declineMessage } from '@checkout-kit/testing'
import { hostedPageProvider, type HostedPageConfig } from './provider'

// The same suite the card plugins pass, for a plugin that never sees a card. Nothing about
// the contract had to bend: the payment takes one turn around the action loop instead of
// none, and the outcome arrives from the bank's page rather than from `confirm`.

const config: HostedPageConfig = {
  baseUrl: 'http://payments.test/api',
  pageUrl: 'https://bank-page.test/pay',
}

/** The shopper paying on the bank's page. In production this happens on another site. */
const payOnTheBankPage = async (orderId: string, cardNumber: string): Promise<void> => {
  await fetch(`${config.baseUrl}/hosted/orders/${orderId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ cardNumber }),
  })
}

describeProviderContract({
  provider: hostedPageProvider,
  config,
  handlers: hostedPageHandlers,
  declineMessage: declineMessage(),
  secrets: Object.values(SCENARIO_CARDS),

  // Nothing is collected on our side, whatever the case.
  instrumentFor: () => ({ kind: 'none' }),

  evidenceFor: async (action, testCase) => {
    await payOnTheBankPage(action.id, SCENARIO_CARDS[testCase])

    return {
      via: 'return_url',
      actionId: action.id,
      // The bank always claims success on the way back, and the plugin always ignores it:
      // these parameters came through the shopper's address bar. A declined payment that
      // stays declined here is the whole point of the re-read.
      params: { orderId: action.id, status: 'success' },
    }
  },
})
