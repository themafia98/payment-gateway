import { useShallow } from 'zustand/react/shallow'
import { useCheckoutStore } from './checkout.store'
import type { CheckoutStatus, CheckoutStore } from './checkout.types'
import { BUSY, SETTLED } from './constants'

export const selectStatus = (s: CheckoutStore): CheckoutStatus => s.status
export const selectIntent = (s: CheckoutStore) => s.intent
export const selectAction = (s: CheckoutStore) => s.action
export const selectError = (s: CheckoutStore) => s.error

export const selectIsBusy = (s: CheckoutStore): boolean => BUSY.has(s.status)

export const selectRequiresAction = (s: CheckoutStore): boolean => s.status === 'requires_action'
export const selectIsSucceeded = (s: CheckoutStore): boolean => s.status === 'succeeded'

export const selectIsSettled = (s: CheckoutStore): boolean => SETTLED.has(s.status)

export const useCheckoutStatus = () => useCheckoutStore(selectStatus)
export const useCheckoutIntent = () => useCheckoutStore(selectIntent)
export const useCheckoutAction = () => useCheckoutStore(selectAction)
export const useCheckoutError = () => useCheckoutStore(selectError)
export const useCheckoutIsBusy = () => useCheckoutStore(selectIsBusy)

/**
 * Only `setMethod` is left: everything else about a payment now comes from the engine, and
 * a component that wants to change it calls the engine rather than the store.
 */
export const useCheckoutActions = () =>
  useCheckoutStore(useShallow((s) => ({ setMethod: s.setMethod })))
