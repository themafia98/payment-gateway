import { devtools } from 'zustand/middleware/devtools'
import { immer } from 'zustand/middleware/immer'
import { create } from 'zustand/react'
import type { StateCreator } from 'zustand'
import type { CheckoutState, CheckoutStore } from './checkout.types'
import { resultToState } from './checkout.mapper'

const initialState: CheckoutState = {
  status: 'idle',
  intent: null,
  challenge: null,
  error: null,
}

type CheckoutMutators = [['zustand/devtools', never], ['zustand/immer', never]]

const middlewares = <T>(f: StateCreator<T, CheckoutMutators>) =>
  devtools(immer(f), { name: 'checkout-store' })

export const useCheckoutStore = create<CheckoutStore>()(
  middlewares<CheckoutStore>((set) => ({
    ...initialState,

    startPayment: () =>
      set(
        (s) => {
          s.status = 'processing'
          s.error = null
        },
        undefined,
        'checkout/startPayment',
      ),

    applyResult: (result) => set(resultToState(result), false, 'checkout/applyResult'),

    startAuthentication: () =>
      set(
        (s) => {
          s.status = 'authenticating'
        },
        undefined,
        'checkout/startAuthentication',
      ),

    reset: () => set(initialState, false, 'checkout/reset'),
  })),
)
