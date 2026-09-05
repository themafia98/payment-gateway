import { useCheckoutStore } from './checkout.store'
import type { CheckoutStore } from './checkout.types'

export const selectState = (s: CheckoutStore) => s.state
export const selectIntent = (s: CheckoutStore) => s.intent
export const selectAction = (s: CheckoutStore) => s.action
export const selectError = (s: CheckoutStore) => s.error
export const selectCapabilities = (s: CheckoutStore) => s.capabilities
export const selectIsLocked = (s: CheckoutStore): boolean => s.isLocked

export const useCheckoutState = () => useCheckoutStore(selectState)
export const useCheckoutIntent = () => useCheckoutStore(selectIntent)
export const useCheckoutAction = () => useCheckoutStore(selectAction)
export const useCheckoutError = () => useCheckoutStore(selectError)
export const useCheckoutCapabilities = () => useCheckoutStore(selectCapabilities)
export const useCheckoutIsLocked = () => useCheckoutStore(selectIsLocked)
