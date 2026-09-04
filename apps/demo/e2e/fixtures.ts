import { test as base } from '@playwright/test'
import { CheckoutPage } from './pages/checkout.page'
import { SuccessPage } from './pages/success.page'
import { FailurePage } from './pages/failure.page'
import { ThreeDSPage } from './pages/three-ds.page'

type Fixtures = {
  checkoutPage: CheckoutPage
  successPage: SuccessPage
  failurePage: FailurePage
  threeDsPage: ThreeDSPage
}

export const test = base.extend<Fixtures>({
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page))
  },
  successPage: async ({ page }, use) => {
    await use(new SuccessPage(page))
  },
  failurePage: async ({ page }, use) => {
    await use(new FailurePage(page))
  },
  threeDsPage: async ({ page }, use) => {
    await use(new ThreeDSPage(page))
  },
})

export { expect } from '@playwright/test'
