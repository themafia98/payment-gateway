import type { CheckoutSnapshot, CheckoutPhase } from '@checkout-kit/core'
import type { CheckoutState, CheckoutStatus } from './checkout.types'

// The engine's phases are finer-grained than anything this UI shows: it distinguishes
// creating an intent from confirming it, and running an action from resuming after one.
// The app only needs to know whether to spin, prompt or stop, so several phases collapse
// into one status here.
//
// Written as an exhaustive record rather than a switch on purpose: when the engine gains a
// phase, this file stops compiling, which is exactly where the decision belongs.
const STATUS_BY_PHASE: Record<CheckoutPhase, CheckoutStatus> = {
  idle: 'idle',
  preparing: 'idle',
  ready: 'idle',

  creating: 'processing',
  confirming: 'processing',

  action_pending: 'requires_action',

  // The three phases that finally give `authenticating` something to mean: the shopper is
  // with the bank, or we are settling what they did there.
  action_running: 'authenticating',
  resuming: 'authenticating',
  polling: 'authenticating',

  succeeded: 'succeeded',
  declined: 'declined',
  canceled: 'canceled',
  failed: 'error',
}

export const toCheckoutStatus = (phase: CheckoutPhase): CheckoutStatus => STATUS_BY_PHASE[phase]

export const snapshotToState = (snapshot: CheckoutSnapshot): Omit<CheckoutState, 'method'> => ({
  status: toCheckoutStatus(snapshot.phase),
  intent: snapshot.intent,
  action: snapshot.action,
  error: snapshot.error,
})
