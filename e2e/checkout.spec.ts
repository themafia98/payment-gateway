import { test, expect } from './fixtures'
import { CARDS } from './data/cards'
import { URL_PATTERNS } from './data/routes'
import { PLANS } from './data/text'

test.describe('Checkout', () => {
  test('a good card completes the payment and shows the receipt', async ({
    page,
    checkoutPage,
    successPage,
  }) => {
    await test.step('open the checkout', () => checkoutPage.goto())
    await test.step('pay with a good card', () => checkoutPage.pay(CARDS.success))

    await expect(page).toHaveURL(URL_PATTERNS.success)
    await expect(successPage.heading).toBeVisible()
    await expect(successPage.transactionId).toBeVisible()
  })

  test('a declined card shows an inline error and stays on the form', async ({
    page,
    checkoutPage,
  }) => {
    await checkoutPage.goto()
    await checkoutPage.pay(CARDS.declined)

    await expect(checkoutPage.errorAlert).toContainText(/declined/i)
    await expect(page).not.toHaveURL(URL_PATTERNS.summary)
  })

  test('a 3-D Secure card routes to the challenge page', async ({
    page,
    checkoutPage,
    threeDsPage,
  }) => {
    await threeDsPage.stubAcs()
    await checkoutPage.goto()
    await checkoutPage.pay(CARDS.requiresAction)

    await expect(page).toHaveURL(URL_PATTERNS.threeDsChallenge)
    await expect(threeDsPage.challengeFrame).toBeVisible()
  })

  test('the plan catalog is fetched from the backend', async ({ page, checkoutPage }) => {
    const plansResponse = page.waitForResponse((res) => res.url().includes('/api/plans'))

    await checkoutPage.goto()
    await expect(plansResponse).resolves.toBeTruthy()

    await expect(checkoutPage.planCard(PLANS.monthly)).toBeVisible()
    await expect(checkoutPage.planCard(PLANS.yearly)).toBeVisible()
  })
})

test.describe('Result pages', () => {
  test('the failure page renders directly', async ({ failurePage }) => {
    await failurePage.goto()

    await expect(failurePage.heading).toBeVisible()
  })
})
