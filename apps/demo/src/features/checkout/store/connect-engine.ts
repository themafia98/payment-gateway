import type { CheckoutEngine } from '@pg/core'
import { useCheckoutStore } from './checkout.store'
import { snapshotToState } from './checkout.mapper'

/**
 * Wires the engine to this app's store, one way.
 *
 * Called once from the composition root. The returned function unsubscribes, which matters
 * for tests more than for the app - the engine outlives every component here.
 */
export const connectCheckoutStore = (engine: CheckoutEngine): (() => void) => {
  const sync = () => {
    useCheckoutStore.getState().syncFromEngine(snapshotToState(engine.getSnapshot()))
  }

  sync()
  return engine.subscribe(sync)
}
