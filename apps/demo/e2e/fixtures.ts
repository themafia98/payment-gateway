import { test as base } from '@playwright/test'
import { CheckoutPage } from './pages/checkout.page'
import { SuccessPage } from './pages/success.page'
import { FailurePage } from './pages/failure.page'
import { ThreeDSPage } from './pages/three-ds.page'
import type { ProviderId } from './data/providers'

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
})

export { expect } from '@playwright/test'
