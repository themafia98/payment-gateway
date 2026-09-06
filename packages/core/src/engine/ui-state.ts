// What a checkout screen shows, derived from what the engine is doing.
//
// Lives here rather than in the React package because both the React bindings and the UI
// kit need it, and it is a plain mapping over CheckoutPhase with no React in it.

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
 * Exhaustive on purpose: a new phase is a compile error here rather than a screen that
 * renders nothing.
 *
 * `editing` and `validating` are missing because the engine cannot know them - they are
 * form states, and the React hook layers them over `idle`.
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
