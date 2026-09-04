// `sessionStorage`, and not `localStorage`, on purpose: a payment left in flight belongs
// to this tab and this visit. It also has to survive a full-page redirect to the bank and
// back, which rules out memory.
//
// Every call is guarded. Storage throws outright in a few real situations - Safari private
// mode, a browser configured to block site data, a page embedded where storage is
// partitioned - and a payment must not fail because a note could not be written. Losing
// the note only costs redirect recovery.

import type { StorageAdapter } from '@pg/core'

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
