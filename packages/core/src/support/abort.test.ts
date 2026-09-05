import { describe, expect, it, vi } from 'vitest'
import { anySignal } from './abort'

describe('anySignal', () => {
  it('aborts when the first one does', () => {
    const first = new AbortController()
    const second = new AbortController()
    const signal = anySignal([first.signal, second.signal])

    first.abort('the shopper closed it')

    expect(signal.aborted).toBe(true)
    expect(signal.reason).toBe('the shopper closed it')
  })

  it('aborts when a later one does', () => {
    const first = new AbortController()
    const second = new AbortController()
    const signal = anySignal([first.signal, second.signal])

    second.abort()

    expect(signal.aborted).toBe(true)
  })

  it('is already aborted if one of them was', () => {
    const done = new AbortController()
    done.abort()

    expect(anySignal([done.signal, new AbortController().signal]).aborted).toBe(true)
  })

  it('works without AbortSignal.any', () => {
    // Safari before 17.4. A phone two versions behind still buys things.
    const original = AbortSignal.any
    // @ts-expect-error deleting a method the runtime may not have had
    delete AbortSignal.any

    try {
      const controller = new AbortController()
      const signal = anySignal([controller.signal, new AbortController().signal])
      expect(signal.aborted).toBe(false)

      controller.abort()
      expect(signal.aborted).toBe(true)
    } finally {
      AbortSignal.any = original
    }
  })

  it('stops listening once it has fired', () => {
    const controller = new AbortController()
    const other = new AbortController()
    const remove = vi.spyOn(other.signal, 'removeEventListener')
    const original = AbortSignal.any
    // @ts-expect-error same as above
    delete AbortSignal.any

    try {
      anySignal([controller.signal, other.signal])
      controller.abort()

      // A payment that leaves listeners on a long-lived signal leaks one per attempt.
      expect(remove).toHaveBeenCalled()
    } finally {
      AbortSignal.any = original
    }
  })
})
