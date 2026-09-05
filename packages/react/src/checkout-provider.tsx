import type { ReactElement, ReactNode } from 'react'
import type { CheckoutEngine } from '@checkout-kit/core'
import { CheckoutContext } from './context'

export interface CheckoutProviderProps {
  engine: CheckoutEngine
  children: ReactNode
}

/**
 * Puts one engine in scope. The engine is created by the host - usually once, at the
 * composition root - because it owns state that must outlive any component: an intent in
 * flight, a pending action, a payment that is mid-redirect.
 */
export const CheckoutProvider = ({ engine, children }: CheckoutProviderProps): ReactElement => (
  <CheckoutContext value={engine}>{children}</CheckoutContext>
)
