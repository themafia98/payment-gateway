import { type Locator, type Page } from '@playwright/test'
import { ACS_ORIGIN, TEXT } from '../data/text'

export class ThreeDSPage {
  readonly page: Page
  readonly challengeFrame: Locator

  constructor(page: Page) {
    this.page = page
    this.challengeFrame = page.getByTitle(TEXT.challengeFrameTitle)
  }

  // The ACS bank server isn't running in CI. Stub its origin so the challenge iframe
  // doesn't error-redirect, letting tests assert the routing into the challenge page.
  async stubAcs() {
    await this.page.route(`${ACS_ORIGIN}/**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>ACS</title>',
      }),
    )
  }
}
