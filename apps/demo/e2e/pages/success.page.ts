import { type Locator, type Page } from '@playwright/test'
import { ROUTES } from '../data/routes'
import { TEXT } from '../data/text'

export class SuccessPage {
  readonly page: Page
  readonly heading: Locator
  readonly transactionId: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByText(TEXT.paymentSuccessful)
    this.transactionId = page.getByText(TEXT.transactionId)
  }

  async goto() {
    await this.page.goto(ROUTES.success)
  }
}
