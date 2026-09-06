import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  createFakeProvider,
  createScriptedRunners,
  fakeAction,
  fakeIntent,
  type FakeProviderScript,
} from '@checkout-kit/testing/engine'
import {
  createCheckout,
  PHASE_TO_UI_STATE,
  type CardExpiration,
  type CardNumber,
  type CheckoutEngine,
  type CheckoutPhase,
  type CvcCode,
  type PaymentInstrument,
} from '@checkout-kit/core'
import { CheckoutProvider } from './checkout-provider'
import { useCheckout } from './use-checkout'
import { usePaymentState, type PaymentStateInput } from './use-payment-state'

const CARD: PaymentInstrument = {
  kind: 'card',
  number: '4242424242424242' as CardNumber,
  exp: '12/30' as CardExpiration,
  cvc: '123' as CvcCode,
}

const setup = (script: FakeProviderScript = {}): CheckoutEngine => {
  const { provider } = createFakeProvider(script)
  return createCheckout({
    providers: [{ id: provider.id, config: {}, load: () => provider, eager: true }],
    runners: createScriptedRunners(),
    returnUrl: 'https://shop.test/payment/return',
    defaultProviderId: provider.id,
  })
}

const wrapper = (engine: CheckoutEngine) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <CheckoutProvider engine={engine}>{children}</CheckoutProvider>
  )
  return Wrapper
}

const State = (input: PaymentStateInput) => <p data-testid="state">{usePaymentState(input)}</p>

const state = () => screen.getByTestId('state').textContent

afterEach(cleanup)

describe('usePaymentState', () => {
  it('starts idle and follows the payment through to success', async () => {
    const engine = setup()
    render(<State />, { wrapper: wrapper(engine) })

    expect(state()).toBe('idle')

    await act(async () => {
      await engine.pay({ input: { planId: 'plan_1' }, instrument: CARD })
    })

    expect(state()).toBe('success')
  })

  it('waits on the shopper, not on us, while an action is pending', async () => {
    const engine = setup({
      confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
    })
    render(<State />, { wrapper: wrapper(engine) })

    await act(async () => {
      await engine.pay({ input: { planId: 'plan_1' }, instrument: CARD })
    })

    expect(state()).toBe('requires_action')
  })

  it('reports a decline as failure and an abort as cancelled', async () => {
    const declined = setup({
      confirm: [
        {
          status: 'declined',
          intent: fakeIntent({ status: 'declined' }),
          error: { code: 'card_declined', message: 'Your card was declined.' },
        },
      ],
    })
    const { unmount } = render(<State />, { wrapper: wrapper(declined) })
    await act(async () => {
      await declined.pay({ input: { planId: 'plan_1' }, instrument: CARD })
    })
    expect(state()).toBe('failure')
    unmount()

    const cancelled = setup({
      confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
    })
    render(<State />, { wrapper: wrapper(cancelled) })
    await act(async () => {
      await cancelled.pay({ input: { planId: 'plan_1' }, instrument: CARD })
      await cancelled.abort('user')
    })

    expect(state()).toBe('cancelled')
  })

  it('layers the form states over idle, and never over a running payment', async () => {
    const engine = setup()
    const { rerender } = render(<State isDirty />, { wrapper: wrapper(engine) })

    expect(state()).toBe('editing')

    rerender(<State isDirty isValidating />)
    expect(state()).toBe('validating')

    await act(async () => {
      await engine.pay({ input: { planId: 'plan_1' }, instrument: CARD })
    })

    // The form is still dirty, but that is no longer what the screen is about.
    expect(state()).toBe('success')
  })

  it('has an answer for every phase the engine can be in', () => {
    const phases = Object.keys(PHASE_TO_UI_STATE) as CheckoutPhase[]

    expect(phases).toHaveLength(13)
    for (const phase of phases) expect(PHASE_TO_UI_STATE[phase]).toBeTruthy()
  })
})

describe('isLocked', () => {
  const Locked = () => <p data-testid="locked">{String(useCheckout().isLocked)}</p>

  it('covers the gap isBusy leaves while an action is on screen', async () => {
    const engine = setup({
      confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
    })
    render(<Locked />, { wrapper: wrapper(engine) })

    await act(async () => {
      await engine.pay({ input: { planId: 'plan_1' }, instrument: CARD })
    })

    // isBusy is false here on purpose - the engine is waiting on the shopper - but the form
    // must stay shut all the same.
    expect(engine.getSnapshot().phase).toBe('action_pending')
    expect(screen.getByTestId('locked').textContent).toBe('true')
  })
})
