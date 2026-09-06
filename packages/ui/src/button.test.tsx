import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Button } from './button'

afterEach(cleanup)

describe('Button', () => {
  it('is a button that does not submit unless told to', () => {
    render(<Button>Continue payment</Button>)

    expect(screen.getByRole('button', { name: 'Continue payment' }).getAttribute('type')).toBe(
      'button',
    )
  })

  it('passes through the attributes a form needs', () => {
    render(
      <Button type="submit" form="checkout" data-testid="pay">
        Pay
      </Button>,
    )

    const button = screen.getByTestId('pay')

    expect(button.getAttribute('type')).toBe('submit')
    expect(button.getAttribute('form')).toBe('checkout')
  })

  describe('while busy', () => {
    it('keeps its label, so the target does not move mid-payment', () => {
      render(<Button busy>Continue payment</Button>)

      expect(screen.getByRole('button', { name: /Continue payment/ })).toBeDefined()
    })

    it('says so, and stops responding', () => {
      const onClick = vi.fn()
      render(
        <Button busy onClick={onClick}>
          Pay
        </Button>,
      )

      const button = screen.getByRole('button')
      button.click()

      expect(button.getAttribute('aria-busy')).toBe('true')
      expect(button.getAttribute('aria-disabled')).toBe('true')
      expect(onClick).not.toHaveBeenCalled()
    })

    it('stays focusable', () => {
      // A disabled button loses focus, which drops the shopper at the top of the page
      // exactly when they are watching for an answer.
      render(<Button busy>Pay</Button>)

      const button = screen.getByRole('button')
      button.focus()

      expect(button.hasAttribute('disabled')).toBe(false)
      expect(document.activeElement).toBe(button)
    })
  })

  it('does not fire when disabled', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Pay
      </Button>,
    )

    screen.getByRole('button').click()

    expect(onClick).not.toHaveBeenCalled()
  })
})
