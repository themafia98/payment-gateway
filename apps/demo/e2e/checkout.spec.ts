import { test, cardEntryTest, hostedPageTest, expect } from './fixtures'
import { CARDS } from './data/cards'
import { URL_PATTERNS } from './data/routes'
import { PLANS, TEXT } from './data/text'

test.describe('Checkout', () => {
  cardEntryTest(
    'a good card completes the payment and shows the receipt',
    async ({ page, checkoutPage, successPage }) => {
      await test.step('open the checkout', () => checkoutPage.goto())
      await test.step('pay with a good card', () => checkoutPage.pay(CARDS.success))

      await expect(page).toHaveURL(URL_PATTERNS.success)
      await expect(successPage.heading).toBeVisible()
      await expect(successPage.transactionId).toBeVisible()
    },
  )

  cardEntryTest(
    'a declined card shows an inline error and stays on the form',
    async ({ page, checkoutPage }) => {
      await checkoutPage.goto()
      await checkoutPage.pay(CARDS.declined)

      // The exact issuer message, not just /declined/i: the adapter used to report
      // "Unexpected status declined", which matched the old regex while showing the
      // user nonsense.
      await expect(checkoutPage.errorAlert).toHaveText(TEXT.declinedMessage)
      await expect(page).not.toHaveURL(URL_PATTERNS.summary)
    },
  )

  cardEntryTest(
    'a 3-D Secure card routes to the challenge page',
    async ({ page, checkoutPage, threeDsPage }) => {
      await threeDsPage.stubAcs()
      await checkoutPage.goto()
      await checkoutPage.pay(CARDS.requiresAction)

      await expect(page).toHaveURL(URL_PATTERNS.paymentAction)
      await expect(threeDsPage.challengeFrame).toBeVisible()
    },
  )

  // Some authorizations are answered later. Nothing pushes the result to the browser, so
  // the checkout has to keep asking - and used to sit there forever instead.
  cardEntryTest(
    'a payment that settles asynchronously is waited out',
    async ({ page, checkoutPage, successPage }) => {
      await checkoutPage.goto()
      await checkoutPage.pay(CARDS.processing)

      await expect(page).toHaveURL(URL_PATTERNS.success, { timeout: 15_000 })
      await expect(successPage.heading).toBeVisible()
    },
  )

  test('the plan catalog is fetched from the backend', async ({ page, checkoutPage }) => {
    const plansResponse = page.waitForResponse((res) => res.url().includes('/api/plans'))

    await checkoutPage.goto()
    await expect(plansResponse).resolves.toBeTruthy()

    await expect(checkoutPage.planCard(PLANS.monthly)).toBeVisible()
    await expect(checkoutPage.planCard(PLANS.yearly)).toBeVisible()
  })
})

test.describe('Payments taken on the bank site', () => {
  hostedPageTest(
    'the shopper pays on the bank page and comes back paid',
    async ({ page, checkoutPage, bankPage, successPage }) => {
      await checkoutPage.goto()

      // No card fields to fill: this provider collects them itself, and the checkout knows
      // not to ask for what it will never send.
      await expect(checkoutPage.cardNumber).toHaveCount(0)
      await checkoutPage.fillBilling()
      await checkoutPage.payButton.click()

      await expect(bankPage.payButton).toBeVisible()
      await bankPage.pay(CARDS.success)

      await expect(page).toHaveURL(URL_PATTERNS.success)
      await expect(successPage.heading).toBeVisible()
    },
  )

  // The single most valuable thing this integration demonstrates: what comes back through
  // the shopper's address bar is a claim, and claims are checked.
  hostedPageTest(
    'a success claimed in the return URL is not believed',
    async ({ page, checkoutPage, bankPage, failurePage }) => {
      await checkoutPage.goto()
      await checkoutPage.fillBilling()
      await checkoutPage.payButton.click()

      await expect(bankPage.payButton).toBeVisible()
      const orderId = bankPage.orderId()
      const returnUrl = bankPage.returnUrl()

      // Never paid; walked back in through the front door announcing success.
      await page.goto(`${returnUrl}?orderId=${orderId}&status=success`)

      await expect(page).toHaveURL(URL_PATTERNS.failure)
      await expect(failurePage.heading).toBeVisible()
    },
  )
})

test.describe('Result pages', () => {
  // The only path the app itself takes to this page: a 3-D Secure challenge the
  // bank rejects. Stays in one page context, so the store and the mock backend
  // both survive — a reload would wipe the in-memory intents.
  cardEntryTest(
    'a rejected 3-D Secure challenge lands on the failure page',
    async ({ page, checkoutPage, threeDsPage, failurePage }) => {
      await threeDsPage.stubAcs('N')
      await checkoutPage.goto()
      await checkoutPage.pay(CARDS.requiresAction)

      await expect(page).toHaveURL(URL_PATTERNS.failure)
      await expect(failurePage.heading).toBeVisible()
    },
  )

  // That the intent is actually released is asserted where it can be said without naming
  // an endpoint: the conformance suite proves each plugin cancels, and an engine test
  // proves it happens exactly once. Here the question is only what the shopper sees.
  cardEntryTest(
    'canceling a challenge takes the shopper off it',
    async ({ page, checkoutPage, threeDsPage, failurePage }) => {
      await threeDsPage.stubAcs()
      await checkoutPage.goto()
      await checkoutPage.pay(CARDS.requiresAction)

      await expect(page).toHaveURL(URL_PATTERNS.paymentAction)

      await threeDsPage.cancelButton.click()

      await expect(page).toHaveURL(URL_PATTERNS.failure)
      await expect(failurePage.heading).toBeVisible()
    },
  )

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
