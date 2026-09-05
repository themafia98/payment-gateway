// sessionStorage, not localStorage: a payment in flight belongs to this tab and this
// visit. Every call is guarded, because storage throws outright in some private modes.

import type { StorageAdapter } from '@checkout-kit/core'

export const sessionStorageAdapter = (): StorageAdapter => ({
  read: (key) => {
    try {
      return window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  },

  write: (key, value) => {
    try {
      window.sessionStorage.setItem(key, value)
    } catch {
      // Nothing to do: the flow still works, minus recovery after a redirect.
    }
  },

  remove: (key) => {
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      // As above.
    }
  },
})
