import { describe, expect, it, vi } from 'vitest'
import { createStore } from './store'

interface Counter {
  count: number
  label: string
}

describe('createStore', () => {
  it('returns the same snapshot object until something changes', () => {
    const store = createStore<Counter>({ count: 0, label: 'a' })
    const initial = store.getSnapshot()

    // The whole React binding rests on this: useSyncExternalStore compares snapshots by
    // identity, so a store that allocated on read would re-render forever.
    expect(store.getSnapshot()).toBe(initial)

    store.set({ count: 1 })
    const afterChange = store.getSnapshot()

    expect(afterChange).not.toBe(initial)
    expect(store.getSnapshot()).toBe(afterChange)
    expect(afterChange.count).toBe(1)
  })

  it('ignores a write that changes nothing', () => {
    const store = createStore<Counter>({ count: 0, label: 'a' })
    const before = store.getSnapshot()
    const listener = vi.fn()
    store.subscribe(listener)

    store.set({ count: 0, label: 'a' })

    expect(store.getSnapshot()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies subscribers in order and stops after unsubscribe', () => {
    const store = createStore<Counter>({ count: 0, label: 'a' })
    const seen: string[] = []

    const unsubscribeFirst = store.subscribe(() => seen.push('first'))
    store.subscribe(() => seen.push('second'))

    store.set({ count: 1 })
    unsubscribeFirst()
    store.set({ count: 2 })

    expect(seen).toEqual(['first', 'second', 'second'])
  })

  it('keeps going when one subscriber throws', () => {
    const errors: string[] = []
    const store = createStore<Counter>(
      { count: 0, label: 'a' },
      { debug: () => {}, warn: () => {}, error: (message) => errors.push(message) },
    )

    store.subscribe(() => {
      throw new Error('subscriber is broken')
    })
    const healthy = vi.fn()
    store.subscribe(healthy)

    store.set({ count: 1 })

    // One bad subscriber must not take a payment down with it.
    expect(healthy).toHaveBeenCalledOnce()
    expect(errors).toHaveLength(1)
  })

  it('lets a subscriber unsubscribe from inside its own callback', () => {
    const store = createStore<Counter>({ count: 0, label: 'a' })
    const calls: number[] = []

    const unsubscribe = store.subscribe(() => {
      calls.push(store.getSnapshot().count)
      unsubscribe()
    })

    store.set({ count: 1 })
    store.set({ count: 2 })

    expect(calls).toEqual([1])
  })
})
