import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { createFakeProvider, fakeAction, fakeIntent } from '@checkout-kit/testing/engine'
import {
  createCheckout,
  createRunnerRegistry,
  type ActionSurface,
  type CheckoutEngine,
  type PaymentInstrument,
  type CardExpiration,
  type CardNumber,
  type CvcCode,
  type RunnerContext,
} from '@checkout-kit/core'
import { CheckoutProvider } from './checkout-provider'
import { PaymentActionHost } from './payment-action-host'

const CARD: PaymentInstrument = {
  kind: 'card',
  number: '4242424242424242' as CardNumber,
  exp: '12/30' as CardExpiration,
  cvc: '123' as CvcCode,
}

const ACTION = fakeAction()

/** An engine holding one pending action, plus every runner call it makes. */
const setup = async () => {
  const runs: RunnerContext[] = []
  const runners = createRunnerRegistry()
  runners.register({
    kind: 'redirect',
    surfaces: ['iframe', 'top'],
    run: async (action, ctx) => {
      runs.push(ctx)
      return { via: 'post_message', actionId: action.id, origin: 'https://bank.test', data: {} }
    },
  })

  const { provider } = createFakeProvider({
    // Only what this registry can run: the engine refuses a provider whose actions it has
    // no runner for, which is the point of assertCovers.
    capabilities: { actions: ['redirect'], surfaces: ['iframe', 'top'] },
    confirm: [
      {
        status: 'requires_action',
        intent: fakeIntent({ status: 'requires_action' }),
        action: ACTION,
      },
    ],
  })

  const engine = createCheckout({
    providers: [{ id: provider.id, config: {}, load: () => provider, eager: true }],
    runners,
    returnUrl: 'https://shop.test/payment/return',
    defaultProviderId: provider.id,
  })

  // `pay` stops at the action and waits: running it is the host's job.
  await act(async () => {
    await engine.pay({ input: { planId: 'plan_1' }, instrument: CARD })
  })
  expect(engine.getSnapshot().phase).toBe('action_pending')

  return { engine, runs }
}

const wrapper = (engine: CheckoutEngine) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <CheckoutProvider engine={engine}>{children}</CheckoutProvider>
  )
  return Wrapper
}

/** Lets the action promise settle before the assertions run. */
const settle = () => act(async () => {})

afterEach(cleanup)

describe('<PaymentActionHost>', () => {
  it('runs the pending action and reports the result', async () => {
    const { engine, runs } = await setup()
    const onSettled = vi.fn()

    render(<PaymentActionHost onSettled={onSettled} />, { wrapper: wrapper(engine) })
    await settle()

    expect(runs).toHaveLength(1)
    expect(onSettled).toHaveBeenCalledWith(expect.objectContaining({ status: 'succeeded' }))
    expect(engine.getSnapshot().phase).toBe('succeeded')
  })

  it('runs it once under StrictMode', async () => {
    // Effects fire twice in development. Twice here means two authentication requests
    // for the same payment, and a shopper watching two challenges open.
    const { engine, runs } = await setup()

    render(
      <StrictMode>
        <PaymentActionHost />
      </StrictMode>,
      { wrapper: wrapper(engine) },
    )
    await settle()

    expect(runs).toHaveLength(1)
  })

  it('hands the runner the element it rendered', async () => {
    const { engine, runs } = await setup()

    const { container } = render(<PaymentActionHost className="host" />, {
      wrapper: wrapper(engine),
    })
    await settle()

    const host = container.querySelector('[data-ck-action-host]')
    expect(host).toHaveProperty('className', 'host')
    // The engine gets somewhere to draw, and nothing else about the page.
    expect(runs[0]?.mount?.element).toBe(host)
  })

  it('passes on a surface the host chose over the provider preference', async () => {
    const { engine, runs } = await setup()
    const surface: ActionSurface = 'top'

    render(<PaymentActionHost surface={surface} />, { wrapper: wrapper(engine) })
    await settle()

    expect(ACTION.surface).toBe('iframe')
    expect(runs[0]?.surface).toBe('top')
  })

  it('waits for the host when autoRun is off', async () => {
    const { engine, runs } = await setup()

    render(<PaymentActionHost autoRun={false} />, { wrapper: wrapper(engine) })
    await settle()

    expect(runs).toHaveLength(0)
    expect(engine.getSnapshot().phase).toBe('action_pending')
  })
})
