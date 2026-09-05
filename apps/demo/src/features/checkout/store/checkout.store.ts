import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { create } from 'zustand/react'
import type { StateCreator } from 'zustand'
import type { CheckoutState, CheckoutStore } from './checkout.types'

// The app view of the payment.
//
// A projection: the engine is the source of truth, `connectCheckoutStore` copies its
// snapshot in, and nothing here writes back. Two stores that can both change a payment
// would eventually disagree about whether the shopper was charged.

const initialState: CheckoutState = {
  state: 'idle',
  capabilities: null,
  intent: null,
  action: null,
  error: null,
  isLocked: false,
}

type CheckoutMutators = [['zustand/devtools', never], ['zustand/immer', never]]

const middlewares = <T>(f: StateCreator<T, CheckoutMutators>) =>
  devtools(immer(f), { name: 'checkout-store', enabled: import.meta.env.DEV })

export const useCheckoutStore = create<CheckoutStore>()(
  middlewares<CheckoutStore>((set) => ({
    ...initialState,

    // Replaced wholesale rather than mutated through immer: the snapshot arrives already
    // built, and a payment action carries readonly arrays that a draft cannot hold.
    syncFromEngine: (next) => set(next, false, 'checkout/syncFromEngine'),
  })),
)
