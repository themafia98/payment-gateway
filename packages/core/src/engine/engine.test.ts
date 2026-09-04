import { describe, expect, it, vi } from 'vitest'
import {
  abortedEvidence,
  createFakeProvider,
  createScriptedRunners,
  fakeAction,
  fakeIntent,
  FAKE_PROVIDER_ID,
  type FakeProviderScript,
} from '@pg/testing/engine'
import type { PaymentInstrument } from '../domain/instrument'
import type { CardExpiration, CardNumber, CvcCode } from '../domain/brand'
import { createCheckout, type CheckoutEngine, type CheckoutEngineConfig } from './engine'
import { memoryStorage, PENDING_CHECKOUT_KEY, type StorageAdapter } from './persistence'
import type { RunnerRegistry } from './runner'

const CARD: PaymentInstrument = {
  kind: 'card',
  number: '4242424242424242' as CardNumber,
  exp: '12/30' as CardExpiration,
  cvc: '123' as CvcCode,
}

const PAY = { input: { planId: 'plan_1' }, instrument: CARD }

interface Harness {
  engine: CheckoutEngine
  calls: ReturnType<typeof createFakeProvider>['calls']
  storage: StorageAdapter
}

const setup = (
  script: FakeProviderScript = {},
  overrides: Partial<CheckoutEngineConfig> & { runners?: RunnerRegistry } = {},
): Harness => {
  const { provider, calls } = createFakeProvider(script)
  const storage = overrides.storage ?? memoryStorage()

  const engine = createCheckout({
    providers: [{ id: provider.id, config: {}, load: () => provider, eager: true }],
    defaultProviderId: provider.id,
    runners: overrides.runners ?? createScriptedRunners(),
    returnUrl: 'https://shop.test/3ds/return',
    storage,
    uuid: (() => {
      let n = 0
      return () => `id_${++n}`
    })(),
    sleep: () => Promise.resolve(),
    ...overrides,
  })

  return { engine, calls, storage }
}

describe('checkout engine', () => {
  it('creates an intent, confirms it and settles', async () => {
    const { engine, calls } = setup({
      confirm: [{ status: 'succeeded', intent: fakeIntent({ status: 'succeeded' }) }],
    })

    const result = await engine.pay(PAY)

    expect(result.status).toBe('succeeded')
    expect(engine.getSnapshot().phase).toBe('succeeded')
    expect(calls.createIntent).toHaveLength(1)
    expect(calls.confirm).toHaveLength(1)
  })

  it('reuses one idempotency key across an attempt', async () => {
    const { engine, calls } = setup({
      confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
    })

    await engine.pay(PAY)
    await engine.runPendingAction()

    const keys = new Set([
      ...calls.createIntent.map((call) => call.opts.idempotencyKey),
      ...calls.confirm.map((call) => call.opts.idempotencyKey),
      ...calls.resume.map((call) => call.opts.idempotencyKey),
    ])
    expect(keys.size).toBe(1)
  })

  it('stops at the action and waits to be told to run it', async () => {
    const { engine } = setup({
      confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
    })

    const result = await engine.pay(PAY)

    // The host usually wants to navigate or mount something first.
    expect(result.status).toBe('requires_action')
    expect(engine.getSnapshot().phase).toBe('action_pending')
    expect(engine.getSnapshot().action?.id).toBe('act_1')
  })

  it('runs the action, hands the evidence back and settles', async () => {
    const seen: string[] = []
    const { engine, calls } = setup(
      { confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }] },
      { runners: createScriptedRunners({ onRun: (action) => seen.push(action.id) }) },
    )

    await engine.pay(PAY)
    const result = await engine.runPendingAction()

    expect(seen).toEqual(['act_1'])
    expect(calls.resume).toHaveLength(1)
    expect(result.status).toBe('succeeded')
  })

  it('writes down what a redirect would destroy, before the action runs', async () => {
    const storage = memoryStorage()
    const whileRunning: (string | null)[] = []

    const { engine } = setup(
      {
        confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
        resume: [{ status: 'succeeded', intent: fakeIntent({ status: 'succeeded' }) }],
      },
      {
        storage,
        runners: createScriptedRunners({
          onRun: () => whileRunning.push(storage.read(PENDING_CHECKOUT_KEY)),
        }),
      },
    )

    await engine.pay(PAY)
    await engine.runPendingAction()

    // A top-level redirect ends the page the moment the form submits, so the note has to
    // be on disk before the runner is even called.
    expect(whileRunning[0]).toContain('pi_fake')
    expect(whileRunning[0]).toContain('act_1')
    expect(storage.read(PENDING_CHECKOUT_KEY)).toBeNull()
  })

  it('picks a redirected payment back up from storage', async () => {
    const storage = memoryStorage()
    storage.write(
      PENDING_CHECKOUT_KEY,
      JSON.stringify({
        providerId: FAKE_PROVIDER_ID,
        intentId: 'pi_redirected',
        actionId: 'act_9',
        idempotencyKey: 'key_1',
        startedAt: 0,
      }),
    )

    const { engine, calls } = setup(
      { resume: [{ status: 'succeeded', intent: fakeIntent({ status: 'succeeded' }) }] },
      { storage },
    )

    const result = await engine.hydrate({ transStatus: 'Y' })

    expect(result?.status).toBe('succeeded')
    expect(calls.resume[0]?.intentId).toBe('pi_redirected')
    expect(storage.read(PENDING_CHECKOUT_KEY)).toBeNull()
  })

  it('has nothing to hydrate when no payment was left in flight', async () => {
    const { engine } = setup()
    await expect(engine.hydrate()).resolves.toBeNull()
  })

  it('refuses to loop through actions forever', async () => {
    // A provider that answers every resume with another action.
    const { engine } = setup({
      confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
      resume: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
    })

    await engine.pay(PAY)
    let result = await engine.runPendingAction()
    for (let i = 0; i < 6 && result.status === 'requires_action'; i++) {
      result = await engine.runPendingAction()
    }

    expect(result.status).toBe('error')
    expect(result.status === 'error' && result.error.code).toBe('too_many_actions')
  })

  it('turns a provider that throws into an error result', async () => {
    const { provider } = createFakeProvider()
    const engine = createCheckout({
      providers: [
        {
          id: provider.id,
          config: {},
          load: () => ({
            ...provider,
            create: () => ({
              ...provider.create({} as never),
              createIntent: () => Promise.reject(new Error('the network is on fire')),
            }),
          }),
        },
      ],
      defaultProviderId: provider.id,
      runners: createScriptedRunners(),
      returnUrl: 'https://shop.test/3ds/return',
    })

    const result = await engine.pay(PAY)

    // Callers never need a try/catch around a payment.
    expect(result.status).toBe('error')
    expect(result.status === 'error' && result.error.message).toContain('the network is on fire')
    expect(engine.getSnapshot().phase).toBe('failed')
  })

  it('cancels the intent once when the shopper gives up', async () => {
    const { engine, calls } = setup(
      { confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }] },
      { runners: createScriptedRunners({ evidence: abortedEvidence }) },
    )

    await engine.pay(PAY)
    const result = await engine.runPendingAction()

    expect(result.status).toBe('error')
    expect(engine.getSnapshot().phase).toBe('canceled')
    // Exactly once: the shopper's abort and the interrupted runner's report both land
    // here, and only one of them may release the money.
    expect(calls.cancel).toHaveLength(1)
  })

  it('polls a processing payment until it settles', async () => {
    const statuses = ['processing', 'processing', 'succeeded'] as const
    let index = 0

    const { engine } = setup({
      confirm: [{ status: 'processing', intent: fakeIntent({ status: 'processing' }) }],
      getIntent: () => fakeIntent({ status: statuses[Math.min(index++, 2)] }),
    })

    const result = await engine.pay(PAY)

    expect(result.status).toBe('succeeded')
    expect(engine.getSnapshot().phase).toBe('succeeded')
  })

  it('does not poll a provider that says it cannot', async () => {
    const { engine } = setup({
      capabilities: { poll: false },
      confirm: [{ status: 'processing', intent: fakeIntent({ status: 'processing' }) }],
    })

    const result = await engine.pay(PAY)

    expect(result.status).toBe('error')
    expect(result.status === 'error' && result.error.code).toBe('processing_not_settled')
  })

  it('never puts card details in the snapshot or in storage', async () => {
    const storage = memoryStorage()
    const { engine } = setup(
      { confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }] },
      { storage },
    )

    await engine.pay(PAY)

    const exposed = JSON.stringify({
      snapshot: engine.getSnapshot(),
      stored: storage.read(PENDING_CHECKOUT_KEY),
    })

    expect(exposed).not.toContain('4242424242424242')
    expect(exposed).not.toContain('123')
  })

  it('reports phase changes to subscribers', async () => {
    const { engine } = setup()
    const phases: string[] = []
    engine.on('phase_changed', (event) => phases.push(event.phase))

    await engine.pay(PAY)

    expect(phases).toEqual(['creating', 'confirming', 'succeeded'])
  })

  it('refuses a provider it was never given', async () => {
    const { engine } = setup()
    await expect(engine.useProvider('nope')).rejects.toThrow(/Unknown payment provider/)
  })

  it('keeps a listener that throws from breaking the payment', async () => {
    const { engine } = setup()
    engine.on('result', () => {
      throw new Error('analytics is down')
    })
    const settled = vi.fn()
    engine.on('result', settled)

    await expect(engine.pay(PAY)).resolves.toMatchObject({ status: 'succeeded' })
    expect(settled).toHaveBeenCalled()
  })
})
