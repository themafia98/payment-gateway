import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import { render, screen, cleanup, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  createFakeProvider,
  createScriptedRunners,
  fakeIntent,
  type FakeProviderScript,
} from '@checkout-kit/testing/engine'
import {
  createCheckout,
  type CheckoutEngine,
  type CheckoutSnapshot,
  type PaymentInstrument,
  type CardExpiration,
  type CardNumber,
  type CvcCode,
} from '@checkout-kit/core'
import { CheckoutProvider } from './checkout-provider'
import { useCheckout, useCheckoutSelector } from './use-checkout'

/**
 * Counts commits, not render calls: when a value the component reads has not changed,
 * React does not re-render it at all, so the effect does not run either.
 */
const useCommitCounter = (onCommit: () => void): void => {
  useEffect(onCommit)
}

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

const pay = (engine: CheckoutEngine) =>
  act(async () => {
    await engine.pay({ input: { planId: 'plan_1' }, instrument: CARD })
  })

afterEach(cleanup)

describe('useCheckout', () => {
  it('says what is wrong when there is no provider above it', () => {
    // React prints the render error as well; the test does not need to see it.
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Orphan = () => <p>{useCheckout().phase}</p>

    expect(() => render(<Orphan />)).toThrow(/CheckoutProvider/)
    logged.mockRestore()
  })

  it('renders the current phase and follows the payment', async () => {
    const engine = setup()
    const Phase = () => <p data-testid="phase">{useCheckout().phase}</p>

    render(<Phase />, { wrapper: wrapper(engine) })
    expect(screen.getByTestId('phase').textContent).toBe('idle')

    await pay(engine)

    expect(screen.getByTestId('phase').textContent).toBe('succeeded')
  })

  it('reports whether the form should be locked and whether it is over', async () => {
    const engine = setup()
    const Flags = () => {
      const { isBusy, isSettled } = useCheckout()
      return <p data-testid="flags">{`${isBusy}/${isSettled}`}</p>
    }

    render(<Flags />, { wrapper: wrapper(engine) })
    expect(screen.getByTestId('flags').textContent).toBe('false/false')

    await pay(engine)

    expect(screen.getByTestId('flags').textContent).toBe('false/true')
  })

  it('renders once and stays there when nothing happens', () => {
    // The engine returns the same snapshot object until something changes. If it ever
    // allocates a fresh one per read, this is where the render loop shows up.
    const engine = setup()
    let commits = 0
    const Counter = () => {
      useCommitCounter(() => {
        commits += 1
      })
      return <p>{useCheckout().phase}</p>
    }

    render(<Counter />, { wrapper: wrapper(engine) })

    expect(commits).toBe(1)
  })
})

describe('useCheckoutSelector', () => {
  it('does not re-render while the selected value is unchanged', async () => {
    const engine = setup()
    let selectorCommits = 0
    let snapshotCommits = 0

    const Error = () => {
      useCommitCounter(() => {
        selectorCommits += 1
      })
      const message = useCheckoutSelector((s: CheckoutSnapshot) => s.error?.message ?? '')
      return <p>{message}</p>
    }
    const Everything = () => {
      useCommitCounter(() => {
        snapshotCommits += 1
      })
      return <p>{useCheckout().phase}</p>
    }

    render(
      <>
        <Error />
        <Everything />
      </>,
      { wrapper: wrapper(engine) },
    )
    await pay(engine)

    // The payment went through several phases; the error stayed null the whole way.
    expect(snapshotCommits).toBeGreaterThan(1)
    expect(selectorCommits).toBe(1)
  })

  it('re-renders when the selected value does change', async () => {
    const engine = setup({
      confirm: [
        {
          status: 'declined',
          intent: fakeIntent({ status: 'declined' }),
          error: { code: 'card_declined', message: 'Your card was declined.' },
        },
      ],
    })
    const Error = () => (
      <p data-testid="error">
        {useCheckoutSelector((s: CheckoutSnapshot) => s.error?.message ?? 'none')}
      </p>
    )

    render(<Error />, { wrapper: wrapper(engine) })
    expect(screen.getByTestId('error').textContent).toBe('none')

    await pay(engine)

    // The issuer's own wording, carried all the way from the plugin to the screen.
    expect(screen.getByTestId('error').textContent).toBe('Your card was declined.')
  })
})
