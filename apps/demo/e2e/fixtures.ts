import { test as base } from '@playwright/test'
import { CheckoutPage } from './pages/checkout.page'
import { SuccessPage } from './pages/success.page'
import { FailurePage } from './pages/failure.page'
import { ThreeDSPage } from './pages/three-ds.page'
import { HostedBankPage } from './pages/hosted.page'
import { PROVIDERS, type PaymentFlow, type ProviderId } from './data/providers'

export type CheckoutOptions = {
  /**
   * Which payment provider the run exercises. Set per Playwright project, so the same
   * specs run against every integration without knowing that more than one exists.
   */
  paymentProvider: ProviderId
}

type Fixtures = {
  checkoutPage: CheckoutPage
  successPage: SuccessPage
  failurePage: FailurePage
  threeDsPage: ThreeDSPage
  bankPage: HostedBankPage
}

export const test = base.extend<CheckoutOptions & Fixtures>({
  paymentProvider: ['psp', { option: true }],

  checkoutPage: async ({ page, paymentProvider }, use) => {
    await use(new CheckoutPage(page, paymentProvider))
  },
  successPage: async ({ page }, use) => {
    await use(new SuccessPage(page))
  },
  failurePage: async ({ page }, use) => {
    await use(new FailurePage(page))
  },
  threeDsPage: async ({ page, paymentProvider }, use) => {
    await use(new ThreeDSPage(page, paymentProvider))
  },
  bankPage: async ({ page }, use) => {
    await use(new HostedBankPage(page))
  },
})

/**
 * For specs that type a card into our own form. Providers that collect it elsewhere skip
 * instead of failing, so no spec has to name a provider.
 *
 * A fixture and not a `beforeEach`: a hook would attach to the whole file and skip the
 * provider-agnostic specs too.
 */
const onlyFor = (flow: PaymentFlow) =>
  test.extend<{ requiresFlow: void }>({
    requiresFlow: [
      async ({ paymentProvider }, use) => {
        test.skip(
          PROVIDERS[paymentProvider].flow !== flow,
          `this provider uses the ${PROVIDERS[paymentProvider].flow} flow`,
        )
        await use()
      },
      { auto: true },
    ],
  })

/** Specs that type a card into the checkout's own form. */
export const cardEntryTest = onlyFor('card')

/** Specs about paying on the bank's own site. */
export const hostedPageTest = onlyFor('hosted-page')

/** Specs about the provider's card fields, embedded in our page. */
export const hostedFieldsTest = onlyFor('hosted-fields')

/** Specs about a wallet, whose sheet is drawn by someone else's script. */
export const walletTest = onlyFor('wallet')

/** Specs about a code the shopper pays in their banking app. */
export const transferTest = onlyFor('transfer')

export { expect } from '@playwright/test'
