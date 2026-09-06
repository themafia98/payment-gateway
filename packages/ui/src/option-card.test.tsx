import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { OptionCard, OptionCardGroup } from './option-card'

afterEach(cleanup)

const renderGroup = (value: string | null, onChange = vi.fn()) => {
  render(
    <OptionCardGroup label="How would you like to pay?" value={value} onChange={onChange}>
      <OptionCard value="card" label="Card" description="Visa, Mastercard, Amex" />
      <OptionCard value="transfer" label="Bank transfer" badge="Instant" />
      <OptionCard value="later" label="Pay later" disabled />
    </OptionCardGroup>,
  )
  return onChange
}

describe('OptionCardGroup', () => {
  it('is a real radio group, so the keyboard already works', () => {
    renderGroup('card')

    expect(screen.getByRole('group', { name: 'How would you like to pay?' })).toBeDefined()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('reports which one is chosen', () => {
    renderGroup('transfer')

    expect(screen.getByRole('radio', { name: /Bank transfer/ })).toHaveProperty('checked', true)
    expect(screen.getByRole('radio', { name: /^Card/ })).toHaveProperty('checked', false)
  })

  it('reports a choice by its value', () => {
    const onChange = renderGroup('card')

    screen.getByRole('radio', { name: /Bank transfer/ }).click()

    expect(onChange).toHaveBeenCalledWith('transfer')
  })

  it('does not choose a disabled option', () => {
    const onChange = renderGroup('card')

    const disabled = screen.getByRole('radio', { name: /Pay later/ })
    disabled.click()

    expect(disabled).toHaveProperty('disabled', true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('groups the radios by name, so only one can be chosen', () => {
    renderGroup('card')

    const names = new Set(screen.getAllByRole('radio').map((radio) => radio.getAttribute('name')))

    expect(names.size).toBe(1)
  })

  it('refuses to render outside a group rather than silently doing nothing', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<OptionCard value="card" label="Card" />)).toThrow(/OptionCardGroup/)

    logged.mockRestore()
  })
})
