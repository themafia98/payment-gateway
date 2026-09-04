import { type Locator, type Page } from '@playwright/test'
import { ROUTES } from '../data/routes'
import { PLACEHOLDERS, TEXT } from '../data/text'
import { VALID_BILLING } from '../data/cards'
import { PROVIDERS, type ProviderId } from '../data/providers'

export class CheckoutPage {
  readonly page: Page
  readonly cardNumber: Locator
  readonly expiry: Locator
  readonly cvc: Locator
  readonly country: Locator
  readonly postalCode: Locator
  readonly payButton: Locator
  readonly errorAlert: Locator
  readonly providerTab: Locator

  constructor(page: Page, provider: ProviderId = 'psp') {
    this.page = page
    this.providerTab = page.getByRole('tab', { name: PROVIDERS[provider] })
    this.cardNumber = page.getByPlaceholder(PLACEHOLDERS.cardNumber)
    this.expiry = page.getByPlaceholder(PLACEHOLDERS.expiry)
    this.cvc = page.getByPlaceholder(PLACEHOLDERS.cvc)
    this.country = page.getByPlaceholder(PLACEHOLDERS.country)
    this.postalCode = page.getByPlaceholder(PLACEHOLDERS.postalCode)
    this.payButton = page.getByRole('button', { name: TEXT.payButton })
    this.errorAlert = page.getByRole('alert')
  }

  planCard(name: string): Locator {
    return this.page.getByText(name, { exact: true })
  }

  async goto() {
    await this.page.goto(ROUTES.checkout)
    await this.payButton.waitFor()

    // Chosen through the UI rather than by poking at app state: the switch is part of
    // what every test exercises.
    await this.providerTab.click()
  }

  async fillBillingAndCard(cardNumber: string) {
    await this.cardNumber.fill(cardNumber)
    await this.expiry.fill(VALID_BILLING.expiry)
    await this.cvc.fill(VALID_BILLING.cvc)
    await this.country.fill(VALID_BILLING.country)
    await this.postalCode.fill(VALID_BILLING.postalCode)
  }

  async pay(cardNumber: string) {
    await this.fillBillingAndCard(cardNumber)
    await this.payButton.click()
  }
}
