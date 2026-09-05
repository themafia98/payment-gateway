import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PaymentStatus } from './payment-status'
import { FailureState, SuccessState } from './states'
import { PaymentMethodSelector } from './payment-method-selector'

afterEach(cleanup)

describe('PaymentStatus', () => {
  it('is the live region the payment speaks through', () => {
    render(<PaymentStatus state="submitting" />)

    const status = screen.getByRole('status')

    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(status.textContent).toBe('Sending your payment')
  })

  it('says nothing while the form is still being filled in', () => {
    render(<PaymentStatus state="editing" />)

    // A region that repeats itself on every keystroke trains people to ignore it.
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('prefers the words the provider used', () => {
    render(<PaymentStatus state="failure" message="Your card has insufficient funds." />)

    expect(screen.getByRole('status').textContent).toBe('Your card has insufficient funds.')
  })

  it('can be translated', () => {
    render(<PaymentStatus state="processing" messages={{ processing: 'Обрабатываем платёж' }} />)

    expect(screen.getByRole('status').textContent).toBe('Обрабатываем платёж')
  })
})

describe('payment state screens', () => {
  it('lead with a heading, so the answer is the first thing read', () => {
    render(<SuccessState>Your receipt is on its way.</SuccessState>)

    expect(screen.getByRole('heading', { name: 'Payment successful' })).toBeDefined()
  })

  it('take focus on arrival', () => {
    render(<SuccessState />)

    expect(document.activeElement?.className).toContain('ck-state')
  })

  it('treat cancellation as a variant of failure, not a fifth screen', () => {
    render(<FailureState tone="cancelled" />)

    expect(screen.getByRole('heading', { name: 'Payment cancelled' })).toBeDefined()
  })

  it('show the issuer wording when there is any', () => {
    render(<FailureState tone="declined">Your card was declined.</FailureState>)

    expect(screen.getByText('Your card was declined.')).toBeDefined()
  })
})

describe('PaymentMethodSelector', () => {
  const METHODS = [
    { id: 'card', label: 'Card', description: 'Visa, Mastercard, Amex' },
    { id: 'transfer', label: 'Bank transfer', badge: 'Instant' },
  ]

  it('renders whatever methods the host has, with no list of its own', () => {
    render(<PaymentMethodSelector methods={METHODS} value="card" onChange={() => {}} />)

    expect(screen.getByRole('radio', { name: /^Card/ })).toBeDefined()
    expect(screen.getByRole('radio', { name: /Bank transfer/ })).toBeDefined()
  })

  it('can be a tab row when the methods need no explaining', () => {
    render(
      <PaymentMethodSelector methods={METHODS} value="card" onChange={() => {}} layout="tabs" />,
    )

    expect(screen.getByRole('tablist', { name: 'Payment method' })).toBeDefined()
  })
})
