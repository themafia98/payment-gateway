// What a screen shows, from what the engine is doing. Here rather than in the React package
// because the UI kit needs it too, and there is no React in it.

import type { CheckoutPhase } from './machine'

export type PaymentUiState =
  | 'idle'
  | 'editing'
  | 'validating'
  | 'submitting'
  | 'processing'
  | 'requires_action'
  | 'success'
  | 'failure'
  | 'cancelled'

/**
 * Exhaustive: a new phase is a compile error rather than a screen that renders nothing.
 * `editing` and `validating` are form states, layered over `idle` by the React hook.
 */
export const PHASE_TO_UI_STATE: Record<CheckoutPhase, PaymentUiState> = {
  idle: 'idle',
  // An intent created ahead of submission, for providers that need one. The form stays open.
  preparing: 'idle',
  ready: 'idle',
  creating: 'submitting',
  confirming: 'submitting',
  // Something is on screen and the shopper is acting on it.
  action_pending: 'requires_action',
  action_running: 'requires_action',
  // We are settling; there is nothing for the shopper to do.
  resuming: 'processing',
  polling: 'processing',
  succeeded: 'success',
  declined: 'failure',
  failed: 'failure',
  canceled: 'cancelled',
}
