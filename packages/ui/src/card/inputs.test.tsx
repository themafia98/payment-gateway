import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CardNumberInput, CvcInput, ExpiryInput } from './inputs'

afterEach(cleanup)

const Card = ({ initial = '' }: { initial?: string }) => {
  const [value, setValue] = useState(initial)
  return <CardNumberInput aria-label="Card number" value={value} onChange={setValue} />
}

/** Types into a controlled input the way a browser does: value, caret, and what happened. */
const type = (
  input: HTMLInputElement,
  value: string,
  caret = value.length,
  inputType = 'insertText',
) => {
  Object.defineProperty(input, 'selectionStart', { value: caret, configurable: true })
  fireEvent.input(input, { target: { value }, inputType })
}

const cardInput = () => screen.getByLabelText('Card number') as HTMLInputElement

describe('CardNumberInput', () => {
  it('groups the digits as they are typed', () => {
    render(<Card />)
    const input = cardInput()

    type(input, '4242424242424242')

    expect(input.value).toBe('4242 4242 4242 4242')
  })

  it('regroups when the brand turns out to be Amex', () => {
    render(<Card />)
    const input = cardInput()

    type(input, '378282246310005')

    expect(input.value).toBe('3782 822463 10005')
  })

  it('shows the brand once it can tell', () => {
    render(<Card />)

    type(cardInput(), '4242')

    expect(screen.getByText('Visa')).toBeDefined()
  })

  it('stops at the longest number the brand issues', () => {
    render(<Card />)
    const input = cardInput()

    type(input, '37828224631000512')

    expect(input.value.replace(/\D/g, '')).toHaveLength(15)
  })

  it('leaves the caret where the typing was, not at the end', () => {
    render(<Card initial="4242 4242 4242 4242" />)
    const input = cardInput()
    input.focus()
    const setSelection = vi.spyOn(input, 'setSelectionRange')

    // A 9 typed after the fifth digit: "4242 94242 4242 4242" with the caret at 6.
    type(input, '4242 94242 4242 4242', 6)

    // Five digits precede the caret, so it belongs after the "9" - index 6 of the regrouped
    // "4242 9424 2424 2424". The old input threw it to the end on every edit.
    expect(setSelection).toHaveBeenCalledWith(6, 6)
  })

  it('deletes a digit when backspacing over a gap', () => {
    render(<Card initial="4242 4242" />)
    const input = cardInput()
    input.focus()

    // The browser removes the space and hands back eight digits with the caret at 4.
    type(input, '42424242', 4, 'deleteContentBackward')

    // Putting the space straight back would look like the key did nothing, so the digit in
    // front of the gap goes instead: 4242|4242 becomes 424|4242.
    expect(input.value).toBe('4244 242')
  })
})

describe('ExpiryInput', () => {
  const Expiry = () => {
    const [value, setValue] = useState('')
    return <ExpiryInput aria-label="Expiry" value={value} onChange={setValue} />
  }

  it('adds the separator and stops at four digits', () => {
    render(<Expiry />)
    const input = screen.getByLabelText('Expiry') as HTMLInputElement

    type(input, '1230')
    expect(input.value).toBe('12 / 30')

    type(input, '12 / 3045')
    expect(input.value).toBe('12 / 30')
  })
})

describe('CvcInput', () => {
  const Cvc = ({ brand }: { brand?: 'visa' | 'amex' }) => {
    const [value, setValue] = useState('')
    return <CvcInput aria-label="CVC" brand={brand} value={value} onChange={setValue} />
  }

  it('takes three digits on most cards', () => {
    render(<Cvc brand="visa" />)
    const input = screen.getByLabelText('CVC') as HTMLInputElement

    type(input, '1234')

    expect(input.value).toBe('123')
  })

  it('takes four on Amex', () => {
    render(<Cvc brand="amex" />)
    const input = screen.getByLabelText('CVC') as HTMLInputElement

    type(input, '1234')

    expect(input.value).toBe('1234')
  })
})
