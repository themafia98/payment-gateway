import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { create } from 'zustand/react'
import type { StateCreator } from 'zustand'
import type { CheckoutState, CheckoutStore } from './checkout.types'

// The app's own view of the payment.
//
// It is a projection: the engine is the source of truth, `connectCheckoutStore` copies its
// snapshot in, and nothing here writes back. Two stores that can both change a payment
// would eventually disagree about whether the shopper was charged.

const initialState: CheckoutState = {
  status: 'idle',
  intent: null,
  action: null,
  error: null,
  method: null,
}

type CheckoutMutators = [['zustand/devtools', never], ['zustand/immer', never]]

const middlewares = <T>(f: StateCreator<T, CheckoutMutators>) =>
  devtools(immer(f), { name: 'checkout-store', enabled: import.meta.env.DEV })

export const useCheckoutStore = create<CheckoutStore>()(
  middlewares<CheckoutStore>((set, get) => ({
    ...initialState,

    setMethod: (method) =>
      set(
        (s) => {
          s.method = method
        },
        undefined,
        'checkout/setMethod',
      ),

    // Replaced wholesale rather than mutated through immer: the snapshot arrives already
    // built, and a payment action carries readonly arrays that a draft cannot hold.
    syncFromEngine: (next) =>
      set(
        {
          ...next,
          // A payment back at the start has no chosen method either; anything else would
          // leave the previous attempt's label on the next receipt.
          method: next.status === 'idle' ? null : get().method,
        },
        false,
        'checkout/syncFromEngine',
      ),
  })),
)
