import { afterEach, describe, expect, it, vi } from 'vitest'
import { sessionStorageAdapter } from './session-storage'

let restoreStorage: (() => void) | null = null

afterEach(() => {
  restoreStorage?.()
  restoreStorage = null
  vi.restoreAllMocks()
  window.sessionStorage.clear()
})

describe('sessionStorageAdapter', () => {
  it('reads back what it wrote, and forgets what it removed', () => {
    const storage = sessionStorageAdapter()

    storage.write('key', 'value')
    expect(storage.read('key')).toBe('value')

    storage.remove('key')
    expect(storage.read('key')).toBeNull()
  })

  it('returns null for something it never stored', () => {
    expect(sessionStorageAdapter().read('nothing-here')).toBeNull()
  })

  it('survives storage that throws', () => {
    // Private modes and blocked site data do this. Losing the note costs redirect
    // recovery; throwing here would cost the payment.
    const boom = () => {
      throw new Error('storage is disabled')
    }
    const real = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: { getItem: boom, setItem: boom, removeItem: boom } as unknown as Storage,
    })
    if (real) restoreStorage = () => Object.defineProperty(window, 'sessionStorage', real)

    const storage = sessionStorageAdapter()

    expect(() => storage.write('key', 'value')).not.toThrow()
    expect(storage.read('key')).toBeNull()
    expect(() => storage.remove('key')).not.toThrow()
  })
})
