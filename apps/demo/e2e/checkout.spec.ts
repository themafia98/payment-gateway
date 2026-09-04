import { test, expect } from './fixtures'
import { CARDS } from './data/cards'
import { URL_PATTERNS } from './data/routes'
import { PLANS, TEXT } from './data/text'

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

    // The exact issuer message, not just /declined/i: the adapter used to report
    // "Unexpected status declined", which matched the old regex while showing the
    // user nonsense.
    await expect(checkoutPage.errorAlert).toHaveText(TEXT.declinedMessage)
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

  // Some authorizations are answered later. Nothing pushes the result to the browser, so
  // the checkout has to keep asking - and used to sit there forever instead.
  test('a payment that settles asynchronously is waited out', async ({
    page,
    checkoutPage,
    successPage,
  }) => {
    await checkoutPage.goto()
    await checkoutPage.pay(CARDS.processing)

    await expect(page).toHaveURL(URL_PATTERNS.success, { timeout: 15_000 })
    await expect(successPage.heading).toBeVisible()
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
  // The only path the app itself takes to this page: a 3-D Secure challenge the
  // bank rejects. Stays in one page context, so the store and the mock backend
  // both survive — a reload would wipe the in-memory intents.
  test('a rejected 3-D Secure challenge lands on the failure page', async ({
    page,
    checkoutPage,
    threeDsPage,
    failurePage,
  }) => {
    await threeDsPage.stubAcs('N')
    await checkoutPage.goto()
    await checkoutPage.pay(CARDS.requiresAction)

    await expect(page).toHaveURL(URL_PATTERNS.failure)
    await expect(failurePage.heading).toBeVisible()
  })

  // Abandoning a challenge is not just a navigation: the engine tells the provider to
  // cancel the intent, so the shopper is not left with a pending authorization.
  test('canceling a 3-D Secure challenge releases the payment', async ({
    page,
    checkoutPage,
    threeDsPage,
    failurePage,
  }) => {
    await threeDsPage.stubAcs()
    await checkoutPage.goto()
    await checkoutPage.pay(CARDS.requiresAction)

    await expect(page).toHaveURL(URL_PATTERNS.threeDsChallenge)

    const cancelRequest = page.waitForRequest(
      (request) => request.url().includes('/cancel') && request.method() === 'POST',
    )
    await threeDsPage.cancelButton.click()

    await expect(cancelRequest).resolves.toBeTruthy()
    await expect(page).toHaveURL(URL_PATTERNS.failure)
    await expect(failurePage.heading).toBeVisible()
  })

  test('the failure page without an intent falls back to the checkout', async ({
    page,
    checkoutPage,
    failurePage,
  }) => {
    await failurePage.goto()

    await expect(checkoutPage.payButton).toBeVisible()
    await expect(page).not.toHaveURL(URL_PATTERNS.summary)
  })
})
