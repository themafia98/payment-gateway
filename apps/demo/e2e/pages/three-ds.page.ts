import { type Locator, type Page } from '@playwright/test'
import { ACS_ORIGIN, TEXT } from '../data/text'

export class ThreeDSPage {
  readonly page: Page
  readonly challengeFrame: Locator
  readonly cancelButton: Locator

  constructor(page: Page) {
    this.page = page
    this.challengeFrame = page.getByTitle(TEXT.challengeFrameTitle)
    this.cancelButton = page.getByRole('button', { name: TEXT.cancelChallenge })
  }

  // The ACS bank server isn't running in CI. Stub its origin so the challenge iframe
  // doesn't error-redirect, letting tests assert the routing into the challenge page.
  // Pass a transStatus to also post a CRes back, the way the real ACS does once the
  // shopper finishes authenticating ('Y' approves, 'N' rejects).
  async stubAcs(transStatus?: 'Y' | 'N') {
    const cres = transStatus
      ? `<script>parent.postMessage({ type: '3ds-cres',` +
        ` challengeId: location.pathname.split('/').pop(),` +
        ` transStatus: ${JSON.stringify(transStatus)} }, '*')</script>`
      : ''

    await this.page.route(`${ACS_ORIGIN}/**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!doctype html><title>ACS</title>${cres}`,
      }),
    )
  }
}
