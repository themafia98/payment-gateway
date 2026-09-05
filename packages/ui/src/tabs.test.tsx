import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Tab, Tabs } from './tabs'

afterEach(cleanup)

const renderTabs = (value = 'card', onValueChange = vi.fn()) => {
  render(
    <Tabs aria-label="How to pay" value={value} onValueChange={onValueChange}>
      <Tab value="card">Card</Tab>
      <Tab value="transfer">Transfer</Tab>
      <Tab value="wallet" disabled>
        Wallet
      </Tab>
    </Tabs>,
  )
  return onValueChange
}

describe('Tabs', () => {
  it('is a named tablist with one selected tab', () => {
    renderTabs()

    expect(screen.getByRole('tablist', { name: 'How to pay' })).toBeDefined()
    expect(screen.getByRole('tab', { selected: true }).textContent).toBe('Card')
  })

  it('is one tab stop, not one per tab', () => {
    renderTabs()

    const stops = screen.getAllByRole('tab').filter((tab) => tab.tabIndex === 0)

    expect(stops).toHaveLength(1)
  })

  it('moves with the arrow keys', () => {
    const onValueChange = renderTabs()
    const card = screen.getByRole('tab', { name: 'Card' })
    card.focus()

    fireEvent.keyDown(card, { key: 'ArrowRight' })

    expect(onValueChange).toHaveBeenCalledWith('transfer')
    expect(document.activeElement?.textContent).toBe('Transfer')
  })

  it('wraps around, and skips a tab that cannot be chosen', () => {
    const onValueChange = renderTabs('transfer')
    screen.getByRole('tab', { name: 'Transfer' }).focus()

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })

    expect(onValueChange).toHaveBeenCalledWith('card')
  })

  it('jumps to the ends', () => {
    const onValueChange = renderTabs()
    screen.getByRole('tab', { name: 'Card' }).focus()

    fireEvent.keyDown(document.activeElement!, { key: 'End' })

    expect(onValueChange).toHaveBeenCalledWith('transfer')
  })

  it('does not choose a disabled tab', () => {
    const onValueChange = renderTabs()

    screen.getByRole('tab', { name: 'Wallet' }).click()

    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('locks the whole row while a payment runs', () => {
    const onValueChange = vi.fn()
    render(
      <Tabs value="card" onValueChange={onValueChange} disabled>
        <Tab value="card">Card</Tab>
        <Tab value="transfer">Transfer</Tab>
      </Tabs>,
    )

    screen.getByRole('tab', { name: 'Transfer' }).click()

    // Switching acquirer mid-payment would send the authentication to the wrong bank.
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
