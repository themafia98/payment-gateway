import { type Locator, type Page } from '@playwright/test'
import { ROUTES } from '../data/routes'
import { LABELS, TEXT } from '../data/text'
import { VALID_BILLING } from '../data/cards'
import { PROVIDERS, type ProviderId } from '../data/providers'

export class CheckoutPage {
  readonly page: Page
  readonly cardNumber: Locator
  readonly cardholder: Locator
  readonly expiry: Locator
  readonly cvc: Locator
  readonly email: Locator
  readonly country: Locator
  readonly postalCode: Locator
  readonly payButton: Locator
  readonly errorAlert: Locator
  readonly providerTab: Locator

  constructor(page: Page, provider: ProviderId = 'psp') {
    this.page = page
    this.providerTab = page.getByRole('tab', { name: PROVIDERS[provider].label })
    // By label, which is also an assertion that every field has one.
    this.cardNumber = page.getByLabel(LABELS.cardNumber)
    this.cardholder = page.getByLabel(LABELS.cardholder)
    this.expiry = page.getByLabel(LABELS.expiry)
    this.cvc = page.getByLabel(LABELS.cvc)
    this.email = page.getByLabel(LABELS.email)
    this.country = page.getByLabel(LABELS.country)
    this.postalCode = page.getByLabel(LABELS.postalCode)
    this.payButton = page.getByRole('button', { name: TEXT.payButton })
    this.errorAlert = page.getByRole('alert')
  }

  planCard(name: string): Locator {
    return this.page.getByRole('radio', { name: new RegExp(name) })
  }

  async goto() {
    await this.page.goto(ROUTES.checkout)
    await this.payButton.waitFor()

    // Chosen through the UI rather than by poking at app state: the switch is part of
    // what every test exercises.
    await this.providerTab.click()
  }

  async fillBilling() {
    await this.email.fill(VALID_BILLING.email)
    await this.country.selectOption(VALID_BILLING.country)
    await this.postalCode.fill(VALID_BILLING.postalCode)
  }

  async fillBillingAndCard(cardNumber: string) {
    await this.cardNumber.fill(cardNumber)
    await this.cardholder.fill(VALID_BILLING.holder)
    await this.expiry.fill(VALID_BILLING.expiry)
    await this.cvc.fill(VALID_BILLING.cvc)
    await this.fillBilling()
  }

  async pay(cardNumber: string) {
    await this.fillBillingAndCard(cardNumber)
    await this.payButton.click()
  }
}
