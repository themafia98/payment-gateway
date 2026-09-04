import { type Locator, type Page } from '@playwright/test'
import { ACS_ORIGIN, TEXT } from '../data/text'
import type { ProviderId } from '../data/providers'

export class ThreeDSPage {
  readonly page: Page
  readonly challengeFrame: Locator
  readonly cancelButton: Locator
  private readonly provider: ProviderId

  constructor(page: Page, provider: ProviderId = 'psp') {
    this.page = page
    this.provider = provider
    this.challengeFrame = page.getByTitle(TEXT.challengeFrameTitle)
    this.cancelButton = page.getByRole('button', { name: TEXT.cancelChallenge })
  }

  /**
   * The bank simulator is not running in CI, so its origin is stubbed. Pass a transStatus
   * to also report a verdict back, the way the real one does once the shopper has
   * authenticated ('Y' approves, 'N' rejects).
   *
   * The two integrations differ here, and only here: version 2 answers with a CRes keyed
   * by challenge id, version 1 with a PaRes keyed by MD. The transaction id is read from
   * the posted form when it is there, which is more honest than guessing it from the URL.
   */
  async stubAcs(transStatus?: 'Y' | 'N') {
    await this.page.route(`${ACS_ORIGIN}/**`, (route) => {
      const form = new URLSearchParams(route.request().postData() ?? '')
      const id = form.get('MD') ?? new URL(route.request().url()).pathname.split('/').pop() ?? ''

      const message =
        this.provider === 'acquiring'
          ? { type: '3ds-pares', MD: id, transStatus }
          : { type: '3ds-cres', challengeId: id, transStatus }

      const script = transStatus
        ? `<script>parent.postMessage(${JSON.stringify(message)}, '*')</script>`
        : ''

      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!doctype html><title>ACS</title>${script}`,
      })
    })
  }
}
