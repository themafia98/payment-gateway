import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createFakeProvider,
  createScriptedRunners,
  fakeAction,
  fakeIntent,
  type FakeProviderScript,
} from '@checkout-kit/testing/engine'
import {
  createCheckout,
  type CardExpiration,
  type CardNumber,
  type CheckoutEngine,
  type CvcCode,
  type PaymentInstrument,
} from '@checkout-kit/core'
import { createWebViewBridge, parseBridgeEvent, type BridgeEvent } from './index'

const CARD: PaymentInstrument = {
  kind: 'card',
  number: '4242424242424242' as CardNumber,
  exp: '12 / 30' as CardExpiration,
  cvc: '123' as CvcCode,
  holder: 'Ada Lovelace',
} as PaymentInstrument

const setup = (script: FakeProviderScript = {}) => {
  const { provider } = createFakeProvider(script)
  const engine: CheckoutEngine = createCheckout({
    providers: [{ id: provider.id, config: {}, load: () => provider, eager: true }],
    runners: createScriptedRunners(),
    returnUrl: 'https://shop.test/payment/return',
    defaultProviderId: provider.id,
  })

  const sent: string[] = []
  const bridge = createWebViewBridge(engine, {
    target: { postMessage: (data) => sent.push(data) },
    sessionId: 'sess_1',
  })

  const events = () =>
    sent.map((raw) => {
      const parsed = parseBridgeEvent(raw)
      if (!parsed.ok) throw new Error(`unreadable message: ${raw}`)
      return parsed.message
    })

  return { engine, bridge, sent, events }
}

const types = (events: BridgeEvent[]) => events.map((event) => event.type)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createWebViewBridge', () => {
  it('says hello first, so the host knows what it is talking to', () => {
    const { events } = setup()

    expect(events()[0]).toMatchObject({
      type: 'PAYMENT_READY',
      sessionId: 'sess_1',
      payload: { bridgeVersion: 1 },
    })
  })

  it('does nothing at all outside a WebView', () => {
    const { provider } = createFakeProvider()
    const engine = createCheckout({
      providers: [{ id: provider.id, config: {}, load: () => provider, eager: true }],
      runners: createScriptedRunners(),
      returnUrl: 'https://shop.test/payment/return',
      defaultProviderId: provider.id,
    })

    // The same build has to run in a browser, so a missing host is not an error.
    const bridge = createWebViewBridge(engine, { target: null })

    expect(bridge.isHosted).toBe(false)
  })

  it('reports the payment as it goes', async () => {
    const { engine, events } = setup()

    await engine.pay({ input: { planId: 'plan_1' }, instrument: CARD })

    expect(types(events())).toContain('PAYMENT_INTENT_CREATED')
    expect(types(events())).toContain('PAYMENT_SUCCEEDED')
    expect(events().filter((e) => e.type === 'PAYMENT_STATE_CHANGED').length).toBeGreaterThan(0)
  })

  it('tells the host where a redirect wants to go, so it can decide', async () => {
    const { engine, events } = setup({
      confirm: [
        {
          status: 'requires_action',
          intent: fakeIntent(),
          action: fakeAction({ surface: 'top', url: 'https://bank.test/3ds' }),
        },
      ],
    })

    await engine.pay({ input: { planId: 'plan_1' }, instrument: CARD })

    const required = events().find((event) => event.type === 'PAYMENT_REQUIRES_ACTION')
    expect(required?.payload).toMatchObject({ kind: 'redirect', url: 'https://bank.test/3ds' })
  })

  it('reports a decline with the issuer message', async () => {
    const { engine, events } = setup({
      confirm: [
        {
          status: 'declined',
          intent: fakeIntent({ status: 'declined' }),
          error: { code: 'card_declined', message: 'Your card was declined.' },
        },
      ],
    })

    await engine.pay({ input: { planId: 'plan_1' }, instrument: CARD })

    expect(events().find((event) => event.type === 'PAYMENT_DECLINED')?.payload).toMatchObject({
      code: 'card_declined',
      message: 'Your card was declined.',
    })
  })

  it('never lets card data onto the channel', async () => {
    const { engine, sent, events } = setup({
      confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
    })

    await engine.pay({ input: { planId: 'plan_1' }, instrument: CARD })
    await engine.runPendingAction()

    // The payload is built field by field from a whitelist rather than spread from a
    // snapshot, and this is the test that keeps it that way.
    const everything = sent.join(' ')
    expect(everything).not.toContain('4242424242424242')
    expect(everything).not.toContain('Ada Lovelace')

    // A three-digit code turns up inside a timestamp by chance, so it is compared against
    // whole field values rather than searched for as text.
    const values = events()
      .flatMap((event) => Object.values(event.payload as unknown as Record<string, unknown>))
      .map(String)
    expect(values).not.toContain('123')
  })

  it('takes a cancel from the native side', async () => {
    const { engine } = setup({
      confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
    })
    await engine.pay({ input: { planId: 'plan_1' }, instrument: CARD })

    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          source: 'checkout-kit',
          v: 1,
          id: 'cmd_1',
          sessionId: 'sess_1',
          ts: Date.now(),
          type: 'PAYMENT_CANCEL',
          payload: {},
        }),
      }),
    )
    await vi.waitFor(() => expect(engine.getSnapshot().phase).toBe('canceled'))
  })

  it('ignores a message that is not ours', async () => {
    const { engine } = setup()
    const before = engine.getSnapshot().phase

    window.dispatchEvent(new MessageEvent('message', { data: '{"type":"PAYMENT_CANCEL"}' }))

    expect(engine.getSnapshot().phase).toBe(before)
  })

  it('stops listening when told to', async () => {
    const { engine, bridge, sent } = setup()
    bridge.stop()
    const before = sent.length

    await engine.pay({ input: { planId: 'plan_1' }, instrument: CARD })

    expect(sent).toHaveLength(before)
  })
})
