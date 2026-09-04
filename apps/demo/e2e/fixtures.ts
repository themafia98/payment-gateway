import { test as base } from '@playwright/test'
import { CheckoutPage } from './pages/checkout.page'
import { SuccessPage } from './pages/success.page'
import { FailurePage } from './pages/failure.page'
import { ThreeDSPage } from './pages/three-ds.page'
import { HostedBankPage } from './pages/hosted.page'
import { PROVIDERS, type ProviderId } from './data/providers'

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
 * For specs that type a card into our own form.
 *
 * Some integrations never show one - the shopper enters it on the bank's site - so those
 * runs skip rather than fail. The condition comes from a table of provider traits, so no
 * spec has to name a provider to know whether it applies.
 *
 * An automatic fixture rather than a `beforeEach`: a hook would attach to the whole file
 * and skip the provider-agnostic specs along with these.
 */
export const cardEntryTest = test.extend<{ requiresCardEntry: void }>({
  requiresCardEntry: [
    async ({ paymentProvider }, use) => {
      test.skip(
        !PROVIDERS[paymentProvider].collectsCard,
        'this provider collects the card on its own page',
      )
      await use()
    },
    { auto: true },
  ],
})

/** The mirror image: specs that only make sense when the card is collected elsewhere. */
export const hostedPageTest = test.extend<{ requiresHostedPage: void }>({
  requiresHostedPage: [
    async ({ paymentProvider }, use) => {
      test.skip(
        PROVIDERS[paymentProvider].collectsCard,
        'this provider collects the card on the checkout itself',
      )
      await use()
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
