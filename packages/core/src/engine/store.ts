// A tiny observable store.
//
// `getSnapshot()` returns the same object until something really changes. React compares
// snapshots by identity, so a new object on every read would re-render forever.

import type { Logger } from '../support/logger'

export interface ReadonlyStore<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

export interface Store<T> extends ReadonlyStore<T> {
  set(patch: Partial<T>): void
}

export const createStore = <T extends object>(initial: T, log?: Logger): Store<T> => {
  let snapshot = initial
  const listeners = new Set<() => void>()

  const notify = (): void => {
    // Copied first: a listener may unsubscribe while we iterate.
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch (cause) {
        // One bad subscriber must not take the payment down with it.
        log?.error('checkout store listener threw', { cause })
      }
    }
  }

  return {
    getSnapshot: () => snapshot,

    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    set: (patch) => {
      const changed = (Object.keys(patch) as (keyof T)[]).some(
        (key) => !Object.is(snapshot[key], patch[key]),
      )
      if (!changed) return

      snapshot = { ...snapshot, ...patch }
      notify()
    },
  }
}
