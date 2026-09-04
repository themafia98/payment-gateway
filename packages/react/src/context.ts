// Context and hook live apart from the provider component on purpose: a module that
// exports both a component and other values trips fast-refresh heuristics (and the
// `react/only-export-components` lint rule that encodes them).

import { createContext, useContext, type Context } from 'react'
import type { CheckoutEngine } from '@pg/core'

export const CheckoutContext: Context<CheckoutEngine | null> = createContext<CheckoutEngine | null>(
  null,
)

export const useCheckoutEngine = (): CheckoutEngine => {
  const engine = useContext(CheckoutContext)
  if (!engine) {
    throw new Error('useCheckout must be used inside a <CheckoutProvider>.')
  }
  return engine
}
