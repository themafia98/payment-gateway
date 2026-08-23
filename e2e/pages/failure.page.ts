import { type Locator, type Page } from '@playwright/test'
import { ROUTES } from '../data/routes'
import { TEXT } from '../data/text'

export class FailurePage {
  readonly page: Page
  readonly heading: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByText(TEXT.paymentFailed)
  }

  async goto() {
    await this.page.goto(ROUTES.failure)
  }
}
