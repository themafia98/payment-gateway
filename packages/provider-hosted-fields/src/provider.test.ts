import { describeProviderContract } from '@checkout-kit/conformance'
import { hostedFieldsHandlers } from '@checkout-kit/testing/backend'
import { SCENARIO_CARDS, declineMessage } from '@checkout-kit/testing'
import { hostedFieldsProvider, type HostedFieldsConfig } from './provider'

// The plugin under test has no way to reach a card: the frame tokenizes it and the plugin
// only ever holds the token. The suite plays the frame's part below.

const config: HostedFieldsConfig = {
  baseUrl: 'http://payments.test/api',
  fieldsUrl: 'https://fields.test/fields',
  fieldsOrigin: 'https://fields.test',
}

/** The card being typed into the provider's frame, which turns it into a token. */
const tokenize = async (cardNumber: string): Promise<string> => {
  const response = await fetch(`${config.baseUrl}/hosted-fields/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardNumber }),
  })
  const { token } = (await response.json()) as { token: string }
  return token
}

describeProviderContract({
  provider: hostedFieldsProvider,
  config,
  handlers: hostedFieldsHandlers,
  declineMessage: declineMessage(),
  secrets: Object.values(SCENARIO_CARDS),

  instrumentFor: () => ({ kind: 'none' }),

  evidenceFor: async (action, testCase) => ({
    via: 'post_message',
    actionId: action.id,
    origin: config.fieldsOrigin,
    data: { type: 'ck-fields-token', token: await tokenize(SCENARIO_CARDS[testCase]) },
  }),
})
