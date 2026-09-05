// Where an action is allowed to render. The component knows no protocol: it hands the
// engine a DOM node and reports the result back.

import { useEffect, useRef, type ReactElement } from 'react'
import { createMount } from '@checkout-kit/runtime-browser'
import type { ActionSurface, PaymentResult } from '@checkout-kit/core'
import { useCheckout } from './use-checkout'

export interface PaymentActionHostProps {
  /** Called once the action has run and the provider has judged its evidence. */
  onSettled?: (result: PaymentResult) => void
  /** Override the surface the provider asked for, e.g. to take over the whole window. */
  surface?: ActionSurface
  /** Start as soon as an action is pending. Turn off to run it on a click instead. */
  autoRun?: boolean
  className?: string
}

export const PaymentActionHost = ({
  onSettled,
  surface,
  autoRun = true,
  className,
}: PaymentActionHostProps): ReactElement => {
  const { engine, action, phase } = useCheckout()
  const mountRef = useRef<HTMLDivElement>(null)
  // React 19 mounts effects twice in development. Running a challenge twice would send
  // the shopper two authentication requests, so each action is started at most once.
  const startedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!autoRun || !action || phase !== 'action_pending') return
    if (startedRef.current === action.id) return
    startedRef.current = action.id

    const mount = mountRef.current ? createMount(mountRef.current) : null
    void engine.runPendingAction({ mount, surface }).then((result) => {
      onSettled?.(result)
    })
    // `onSettled` is in the dependency list only to satisfy the exhaustive-deps rule; the
    // guard above is what actually keeps the action from running twice.
  }, [engine, action, phase, autoRun, surface, onSettled])

  return <div ref={mountRef} className={className} data-ck-action-host="" />
}
