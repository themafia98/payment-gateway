import { type Locator, type Page } from '@playwright/test'

/** The bank's own payment page - somewhere the shop's code has no business being. */
export class HostedBankPage {
  readonly page: Page
  readonly cardNumber: Locator
  readonly payButton: Locator

  constructor(page: Page) {
    this.page = page
    this.cardNumber = page.getByLabel('Card number')
    // Exact, or it also matches the checkout's own "Continue payment" button.
    this.payButton = page.getByRole('button', { name: 'Pay', exact: true })
  }

  orderId(): string {
    return new URL(this.page.url()).searchParams.get('orderId') ?? ''
  }

  returnUrl(): string {
    return new URL(this.page.url()).searchParams.get('returnUrl') ?? ''
  }

  async pay(cardNumber: string) {
    await this.cardNumber.fill(cardNumber)
    await this.payButton.click()
  }
}
