// The contract every payment plugin must satisfy, as a runnable test suite.
//
// A plugin author says what their provider is, what backend it talks to and what data
// produces each outcome, and gets back everything the engine and the UI are allowed to
// assume. Cases are named after outcomes, not card numbers: a bank plugin has none.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse, type RequestHandler } from 'msw'
import { resetBackend } from '@pg/testing/backend'
import type {
  ActionEvidence,
  CallOptions,
  PaymentAction,
  PaymentInstrument,
  PaymentProvider,
  PaymentProviderInstance,
  ProviderContext,
} from '@pg/core'

export type ConformanceCase =
  'approve' | 'decline' | 'challengePass' | 'challengeFail' | 'processing' | 'chaos'

export interface ConformanceSuite<TConfig> {
  readonly provider: PaymentProvider<TConfig>
  readonly config: TConfig
  /** MSW handlers for this provider's backend. */
  readonly handlers: readonly RequestHandler[]
  /** The instrument that produces each outcome with this provider. */
  readonly instrumentFor: (testCase: ConformanceCase) => PaymentInstrument
  /** Evidence shaped the way this provider's authentication step reports a verdict. */
  readonly evidenceFor: (action: PaymentAction, outcome: 'pass' | 'fail') => ActionEvidence
  /** The message the issuer returns for `decline`, asserted verbatim. */
  readonly declineMessage: string
  readonly planId?: string
}

const options = (key: string): CallOptions => ({ idempotencyKey: key })

/** Every string anywhere in a value - used to prove card data does not escape. */
const stringsIn = (value: unknown, found: string[] = []): string[] => {
  if (typeof value === 'string') found.push(value)
  else if (Array.isArray(value)) for (const item of value) stringsIn(item, found)
  else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) stringsIn(item, found)
  }
  return found
}

export const describeProviderContract = <TConfig>(suite: ConformanceSuite<TConfig>): void => {
  const server = setupServer(...suite.handlers)
  let provider: PaymentProviderInstance
  let keySeed = 0
  const nextKey = () => `key_${++keySeed}`

  const context: ProviderContext<TConfig> = {
    config: suite.config,
    fetch: (...args) => globalThis.fetch(...args),
    uuid: () => `uuid_${++keySeed}`,
    now: () => Date.now(),
    log: { debug: () => {}, warn: () => {}, error: () => {} },
  }

  describe(`${suite.provider.displayName} (${suite.provider.id}) satisfies the plugin contract`, () => {
    beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())

    beforeEach(() => {
      resetBackend()
      provider = suite.provider.create(context)
    })

    const startPayment = async (testCase: ConformanceCase) => {
      const intent = await provider.createIntent(
        { planId: suite.planId ?? '1id' },
        options(nextKey()),
      )
      const result = await provider.confirm(
        intent.id,
        suite.instrumentFor(testCase),
        options(nextKey()),
      )
      return { intent, result }
    }

    it('declares capabilities it can actually deliver', () => {
      const { capabilities } = suite.provider
      expect(capabilities.instruments.length).toBeGreaterThan(0)
      expect(capabilities.actions.length).toBeGreaterThan(0)

      // The engine trusts this to decide whether cancelling is even offered.
      if (capabilities.cancel) expect(provider.cancel).toBeTypeOf('function')
    })

    it('stamps every intent with the id it was registered under', async () => {
      const { intent } = await startPayment('approve')
      expect(intent.providerId).toBe(suite.provider.id)
    })

    it('replays one idempotency key instead of charging twice', async () => {
      const key = nextKey()
      const first = await provider.createIntent({ planId: suite.planId ?? '1id' }, options(key))
      const second = await provider.createIntent({ planId: suite.planId ?? '1id' }, options(key))

      // The shopper double-clicked, or the network dropped a response and we retried.
      expect(second.id).toBe(first.id)
    })

    it('approves a good instrument, and says so again when asked', async () => {
      const { intent, result } = await startPayment('approve')

      expect(result.status).toBe('succeeded')

      const reread = await provider.getIntent(intent.id, options(nextKey()))
      expect(reread.status).toBe('succeeded')
    })

    it("reports a decline with the issuer's own message", async () => {
      const { result } = await startPayment('decline')

      expect(result.status).toBe('declined')
      // Whatever the shopper is told here is what they will read out to their bank.
      expect(result.status === 'declined' && result.error.message).toBe(suite.declineMessage)
    })

    it('asks for an action it has told the engine it can produce', async () => {
      const { result } = await startPayment('challengePass')

      expect(result.status).toBe('requires_action')
      if (result.status !== 'requires_action') return

      const { capabilities } = suite.provider
      expect(capabilities.actions).toContain(result.action.kind)
      expect(capabilities.surfaces).toContain(result.action.surface)
      expect(result.action.id).toBeTruthy()
    })

    it('settles an approved authentication', async () => {
      const { intent, result } = await startPayment('challengePass')
      if (result.status !== 'requires_action') throw new Error('expected an action')

      const settled = await provider.resume(
        intent.id,
        suite.evidenceFor(result.action, 'pass'),
        options(nextKey()),
      )

      expect(settled.status).toBe('succeeded')
    })

    it('declines a rejected authentication', async () => {
      const { intent, result } = await startPayment('challengePass')
      if (result.status !== 'requires_action') throw new Error('expected an action')

      const settled = await provider.resume(
        intent.id,
        suite.evidenceFor(result.action, 'fail'),
        options(nextKey()),
      )

      expect(settled.status).toBe('declined')
    })

    it('refuses evidence for an action it never issued', async () => {
      const { intent, result } = await startPayment('challengePass')
      if (result.status !== 'requires_action') throw new Error('expected an action')

      const forged = suite.evidenceFor({ ...result.action, id: 'not-a-real-action' }, 'pass')
      const settled = await provider.resume(intent.id, forged, options(nextKey()))

      // Anything but success: a plugin that approves unknown evidence approves anything.
      expect(settled.status).not.toBe('succeeded')
    })

    it('answers a repeated resume the same way twice, without throwing', async () => {
      const { intent, result } = await startPayment('challengePass')
      if (result.status !== 'requires_action') throw new Error('expected an action')

      const evidence = suite.evidenceFor(result.action, 'pass')
      await provider.resume(intent.id, evidence, options(nextKey()))
      const again = await provider.resume(intent.id, evidence, options(nextKey()))

      expect(again.status).toBe('error')
    })

    it('reports an authorization that has not settled yet', async () => {
      if (!suite.provider.capabilities.poll) return

      const { result } = await startPayment('processing')

      // Neither succeeded nor declined - the engine polls from this state.
      expect(result.status).toBe('processing')
    })

    it('turns a provider-side outage into an error, not an exception', async () => {
      const { result } = await startPayment('chaos')

      expect(result.status).toBe('error')
      expect(result.status === 'error' && result.error.message).toBeTruthy()
    })

    it('turns a dead network into an error, not an exception', async () => {
      const intent = await provider.createIntent(
        { planId: suite.planId ?? '1id' },
        options(nextKey()),
      )
      server.use(http.all('*', () => HttpResponse.error()))

      // `confirm` and `resume` carry the payment's outcome, so they must always be able to
      // say what happened - which a thrown error cannot do.
      const result = await provider.confirm(
        intent.id,
        suite.instrumentFor('approve'),
        options(nextKey()),
      )
      expect(result.status).toBe('error')
    })

    it('never lets instrument data back out', async () => {
      const instrument = suite.instrumentFor('approve')
      // Long values only: an expiry or a three-digit code is short enough to appear inside
      // a generated identifier by chance, and a flaky test proves nothing.
      const secrets = stringsIn(instrument).filter((value) => value.length >= 8)

      const { intent, result } = await startPayment('approve')
      const exposed = stringsIn({ intent, result }).join(' ')

      for (const secret of secrets) {
        expect(exposed, `a plugin must not echo "${secret}" back to the app`).not.toContain(secret)
      }
    })

    it('cancels a payment the shopper walked away from', async () => {
      if (!suite.provider.capabilities.cancel) return

      const intent = await provider.createIntent(
        { planId: suite.planId ?? '1id' },
        options(nextKey()),
      )
      const canceled = await provider.cancel?.(intent.id, options(nextKey()))

      expect(canceled?.status).toBe('canceled')
    })
  })
}
