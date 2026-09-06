import {
  isBusyPhase,
  isSettledPhase,
  PHASE_TO_UI_STATE,
  type CheckoutSnapshot,
} from '@checkout-kit/core'
import type { CheckoutState } from './checkout.types'

/**
 * The engine phase is finer-grained than anything a screen shows - it separates creating an
 * intent from confirming it - so the kit collapses the thirteen phases into nine states and
 * this copies the result across.
 */
export const snapshotToState = (snapshot: CheckoutSnapshot): CheckoutState => ({
  state: PHASE_TO_UI_STATE[snapshot.phase],
  capabilities: snapshot.capabilities,
  intent: snapshot.intent,
  action: snapshot.action,
  error: snapshot.error,
  // action_pending is not busy - the engine is waiting on the shopper - but the form still
  // must not reopen underneath a challenge.
  isLocked:
    isBusyPhase(snapshot.phase) ||
    isSettledPhase(snapshot.phase) ||
    snapshot.phase === 'action_pending',
})
