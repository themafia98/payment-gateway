// The contract every payment plugin must satisfy, as a runnable test suite.
//
// A plugin author says what their provider is, what backend it talks to and what data
// produces each outcome, and gets back everything the engine and the UI are allowed to
// assume. Cases are named after outcomes, not card numbers: half of these plugins never
// see a card.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse, type RequestHandler } from 'msw'
import { resetBackend } from '@checkout-kit/testing/backend'
import type {
  ActionEvidence,
  CallOptions,
  PaymentAction,
  PaymentInstrument,
  PaymentInstrumentKind,
  PaymentProvider,
  PaymentProviderInstance,
  PaymentResult,
  ProviderContext,
} from '@checkout-kit/core'

export type ConformanceCase =
  'approve' | 'decline' | 'challengePass' | 'challengeFail' | 'processing'

export interface ConformanceSuite<TConfig> {
  readonly provider: PaymentProvider<TConfig>
  readonly config: TConfig
  /** MSW handlers for this provider's backend. */
  readonly handlers: readonly RequestHandler[]
  /**
   * The instrument that starts each case. Plugins that collect the card somewhere else -
   * a hosted page, a frame, a wallet - return `{ kind: 'none' }` for all of them and
   * decide the outcome in `evidenceFor` instead.
   */
  readonly instrumentFor: (testCase: ConformanceCase) => PaymentInstrument
  /**
   * What comes back from the action, shaped to produce this case's outcome. It may call
   * the backend first: that is what the bank's page or the provider's frame does.
   */
  readonly evidenceFor: (
    action: PaymentAction,
    testCase: ConformanceCase,
  ) => ActionEvidence | Promise<ActionEvidence>
  /** The message the issuer returns for `decline`, asserted verbatim. */
  readonly declineMessage: string
  /** Card numbers this suite pays with. None of them may come back out of the plugin. */
  readonly secrets?: readonly string[]
  readonly planId?: string
}

const options = (key: string): CallOptions => ({ idempotencyKey: key })

/** One of each, to offer a plugin something it says it does not take. */
const ANY_INSTRUMENT = {
  card: { kind: 'card', number: '4242424242424242', exp: '12/30', cvc: '123' },
  token: { kind: 'token', token: 'tok_never_issued' },
  hosted_session: { kind: 'hosted_session', sessionId: 'sess_never_started' },
  wallet: { kind: 'wallet', walletId: 'nobody', payload: {} },
  none: { kind: 'none' },
} as unknown as Record<PaymentInstrumentKind, PaymentInstrument>

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

    /**
     * The engine's loop, in miniature: keep answering actions until the payment settles.
     * A card plugin usually settles on `confirm`; a hosted page always takes one turn
     * around the loop. Same code either way, which is the whole idea.
     */
    const settle = async (testCase: ConformanceCase) => {
      const { intent, result: confirmed } = await startPayment(testCase)
      let result: PaymentResult = confirmed

      for (let step = 0; step < 4 && result.status === 'requires_action'; step += 1) {
        const evidence = await suite.evidenceFor(result.action, testCase)
        result = await provider.resume(intent.id, evidence, options(nextKey()))
      }

      expect(result.status, 'the plugin kept asking for more actions').not.toBe('requires_action')
      return { intent, result }
    }

    it('declares capabilities it can actually deliver', () => {
      const { capabilities } = suite.provider
      expect(capabilities.instruments.length).toBeGreaterThan(0)
      expect(capabilities.actions.length).toBeGreaterThan(0)

      // The engine trusts this to decide whether cancelling is even offered.
      if (capabilities.cancel) expect(provider.cancel).toBeTypeOf('function')
    })

    /**
     * `capabilities.instruments` is what the checkout builds its form from, so it has to
     * be exactly what `confirm` takes. Both halves are checked: a kind that is listed must
     * not be turned away as unsupported, and a kind that is not listed must be.
     */
    it('takes exactly the instruments it says it takes', async () => {
      const { instruments } = suite.provider.capabilities
      const kinds = Object.keys(ANY_INSTRUMENT) as PaymentInstrumentKind[]

      // Refusals leave a payment untouched, so they can share one; anything that might go
      // through gets its own.
      const shared = await provider.createIntent(
        { planId: suite.planId ?? '1id' },
        options(nextKey()),
      )

      for (const kind of kinds) {
        const declared = instruments.includes(kind)
        const intentId = declared
          ? (await provider.createIntent({ planId: suite.planId ?? '1id' }, options(nextKey()))).id
          : shared.id

        const result = await provider.confirm(intentId, ANY_INSTRUMENT[kind], options(nextKey()))
        const refusedTheKind =
          result.status === 'error' && result.error.code === 'unsupported_instrument'

        if (declared) {
          // The instrument itself is made up, so it may well fail - but not for this
          // reason, which would mean the capability is a fiction.
          expect(refusedTheKind, `"${kind}" is declared but confirm refuses the kind`).toBe(false)
        } else {
          expect(result.status, `confirm accepted an undeclared "${kind}" instrument`).toBe('error')
        }
      }
      // Several round trips against a deliberately slow mock backend.
    }, 20_000)

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

    it('approves a good payment, and says so again when asked', async () => {
      const { intent, result } = await settle('approve')

      expect(result.status).toBe('succeeded')

      const reread = await provider.getIntent(intent.id, options(nextKey()))
      expect(reread.status).toBe('succeeded')
    })

    it('reports a decline in the words the issuer used', async () => {
      const { result } = await settle('decline')

      expect(result.status).toBe('declined')
      // Whatever the shopper is told here is what they will read out to their bank.
      expect(result.status === 'declined' && result.error.message).toBe(suite.declineMessage)
    })

    it('carries the amount on every intent it returns', async () => {
      const { intent, result } = await startPayment('approve')

      // The checkout shows this while the payment is in flight, so a placeholder here is
      // a wrong price on the screen.
      expect(intent.amount).toBeGreaterThan(0)
      if ('intent' in result && result.intent) expect(result.intent.amount).toBe(intent.amount)
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
      const { result } = await settle('challengePass')
      expect(result.status).toBe('succeeded')
    })

    it('declines a rejected authentication', async () => {
      const { result } = await settle('challengeFail')
      expect(result.status).toBe('declined')
    })

    it('refuses evidence for an action it never issued', async () => {
      const { intent, result } = await startPayment('challengePass')
      if (result.status !== 'requires_action') throw new Error('expected an action')

      const forged = await suite.evidenceFor(
        { ...result.action, id: 'not-a-real-action' },
        'challengePass',
      )
      const settled = await provider.resume(intent.id, forged, options(nextKey()))

      // Anything but success: a plugin that accepts unknown evidence accepts anything.
      expect(settled.status).not.toBe('succeeded')
    })

    it('does not settle twice when resume is repeated', async () => {
      const { intent, result } = await startPayment('challengePass')
      if (result.status !== 'requires_action') throw new Error('expected an action')

      const evidence = await suite.evidenceFor(result.action, 'challengePass')
      const first = await provider.resume(intent.id, evidence, options(nextKey()))
      const again = await provider.resume(intent.id, evidence, options(nextKey()))

      // A retry, a refreshed tab, an engine picking a payment back up. Either the plugin
      // repeats its answer or it refuses - never a second charge, and never a throw.
      expect([first.status, 'error']).toContain(again.status)

      const reread = await provider.getIntent(intent.id, options(nextKey()))
      expect(reread.status).toBe('succeeded')
    })

    it('reports an authorization that has not settled yet', async () => {
      if (!suite.provider.capabilities.poll) return

      const { result } = await settle('processing')

      // Neither succeeded nor declined - the engine polls from this state.
      expect(result.status).toBe('processing')
    })

    it('turns a provider-side outage into an error, not an exception', async () => {
      const intent = await provider.createIntent(
        { planId: suite.planId ?? '1id' },
        options(nextKey()),
      )
      server.use(
        http.all('*', () =>
          HttpResponse.json(
            { error: { type: 'api_error', message: 'Something went wrong on our end.' } },
            { status: 500 },
          ),
        ),
      )

      const result = await provider.confirm(
        intent.id,
        suite.instrumentFor('approve'),
        options(nextKey()),
      )
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

    it('never lets card data back out', async () => {
      // Long values only: an expiry or a three-digit code is short enough to appear inside
      // a generated identifier by chance, and a flaky test proves nothing.
      const secrets = [
        ...stringsIn(suite.instrumentFor('approve')),
        ...(suite.secrets ?? []),
      ].filter((value) => value.length >= 8)

      const { intent, result } = await settle('approve')
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
