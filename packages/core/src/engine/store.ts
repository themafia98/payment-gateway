// A minimal observable container. Deliberately not zustand, not immer, not signals: the
// core has no framework, and this is the whole surface a framework binding needs.
//
// One rule matters above all: `getSnapshot()` must return the *same object* until a real
// transition happens. React's `useSyncExternalStore` compares snapshots by identity, so a
// container that allocates on read spins forever. `set` therefore compares field by field
// and returns early when nothing actually changed.

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
