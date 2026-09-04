import { useShallow } from 'zustand/react/shallow'
import { useCheckoutStore } from './checkout.store'
import type { CheckoutStatus, CheckoutStore } from './checkout.types'
import { BUSY, SETTLED } from './constants'

export const selectStatus = (s: CheckoutStore): CheckoutStatus => s.status
export const selectIntent = (s: CheckoutStore) => s.intent
export const selectChallenge = (s: CheckoutStore) => s.challenge
export const selectError = (s: CheckoutStore) => s.error

export const selectIsBusy = (s: CheckoutStore): boolean => BUSY.has(s.status)

export const selectRequiresAction = (s: CheckoutStore): boolean => s.status === 'requires_action'
export const selectIsSucceeded = (s: CheckoutStore): boolean => s.status === 'succeeded'

export const selectIsSettled = (s: CheckoutStore): boolean => SETTLED.has(s.status)

export const useCheckoutStatus = () => useCheckoutStore(selectStatus)
export const useCheckoutIntent = () => useCheckoutStore(selectIntent)
export const useCheckoutChallenge = () => useCheckoutStore(selectChallenge)
export const useCheckoutError = () => useCheckoutStore(selectError)
export const useCheckoutIsBusy = () => useCheckoutStore(selectIsBusy)

export const useCheckoutActions = () =>
  useCheckoutStore(
    useShallow((s) => ({
      startPayment: s.startPayment,
      applyResult: s.applyResult,
      startAuthentication: s.startAuthentication,
      reset: s.reset,
    })),
  )
