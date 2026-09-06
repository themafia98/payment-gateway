// React binding over the engine. It works because the engine returns the same snapshot
// object until something changes - see the store.

import { useCallback, useSyncExternalStore } from 'react'
import {
  isBusyPhase,
  isSettledPhase,
  type CheckoutEngine,
  type CheckoutSnapshot,
} from '@checkout-kit/core'

import { useCheckoutEngine } from './context'

export { useCheckoutEngine }

export const useCheckoutSnapshot = (): CheckoutSnapshot => {
  const engine = useCheckoutEngine()
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
}

/**
 * Subscribe to one derived value. Use it for anything that re-renders often: a component
 * reading the whole snapshot re-renders on every phase change, whether it cares or not.
 */
export const useCheckoutSelector = <T>(selector: (snapshot: CheckoutSnapshot) => T): T => {
  const engine = useCheckoutEngine()
  const select = useCallback(() => selector(engine.getSnapshot()), [engine, selector])
  return useSyncExternalStore(engine.subscribe, select, select)
}

export interface UseCheckoutResult extends CheckoutSnapshot {
  engine: CheckoutEngine
  /** A request is in flight. `action_pending` is not busy: the shopper is acting. */
  isBusy: boolean
  /** Nothing further will happen without the shopper starting over. */
  isSettled: boolean
  /** Nothing about the payment may be changed any more. What a form disables on. */
  isLocked: boolean
}

export const useCheckout = (): UseCheckoutResult => {
  const engine = useCheckoutEngine()
  const snapshot = useCheckoutSnapshot()

  return {
    ...snapshot,
    engine,
    isBusy: isBusyPhase(snapshot.phase),
    isSettled: isSettledPhase(snapshot.phase),
    isLocked:
      isBusyPhase(snapshot.phase) ||
      isSettledPhase(snapshot.phase) ||
      snapshot.phase === 'action_pending',
  }
}
