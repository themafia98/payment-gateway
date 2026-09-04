// The checkout as a state machine, as a plain lookup table.
//
// It is kept separate from the engine on purpose: this file has no promises, no provider,
// no storage and no clock, so every legal and illegal transition can be asserted in a
// plain unit test. The engine is then just "call the provider, feed the machine".

export type CheckoutPhase =
  | 'idle'
  /** Creating an intent ahead of submission (providers with `session: 'eager'`). */
  | 'preparing'
  | 'ready'
  | 'creating'
  | 'confirming'
  /** An action came back and is waiting to be run - usually for a click. */
  | 'action_pending'
  | 'action_running'
  | 'resuming'
  | 'polling'
  | 'succeeded'
  | 'declined'
  | 'canceled'
  | 'failed'

export type MachineEvent =
  | 'prepare'
  | 'prepared'
  | 'pay'
  | 'created'
  | 'action_required'
  | 'run_action'
  | 'action_done'
  /** Coming back from a full-page redirect: there is an intent, but no live engine state. */
  | 'hydrate'
  | 'processing'
  | 'succeeded'
  | 'declined'
  | 'canceled'
  | 'failed'
  | 'reset'

const SETTLE = {
  succeeded: 'succeeded',
  declined: 'declined',
  canceled: 'canceled',
  failed: 'failed',
} as const satisfies Partial<Record<MachineEvent, CheckoutPhase>>

const TRANSITIONS: Record<CheckoutPhase, Partial<Record<MachineEvent, CheckoutPhase>>> = {
  idle: { prepare: 'preparing', pay: 'creating', hydrate: 'resuming', reset: 'idle' },
  preparing: { prepared: 'ready', failed: 'failed', reset: 'idle' },
  ready: { pay: 'confirming', prepare: 'preparing', failed: 'failed', reset: 'idle' },
  creating: { created: 'confirming', ...SETTLE, reset: 'idle' },
  confirming: {
    action_required: 'action_pending',
    processing: 'polling',
    ...SETTLE,
    reset: 'idle',
  },
  action_pending: { run_action: 'action_running', ...SETTLE, reset: 'idle' },
  // `run_action` again is a surface change, not a second payment: the shopper moved
  // the same action from a frame into the whole window.
  action_running: {
    run_action: 'action_running',
    action_done: 'resuming',
    ...SETTLE,
    reset: 'idle',
  },
  resuming: { action_required: 'action_pending', processing: 'polling', ...SETTLE, reset: 'idle' },
  polling: { processing: 'polling', ...SETTLE, reset: 'idle' },
  succeeded: { reset: 'idle' },
  declined: { reset: 'idle', pay: 'creating' },
  canceled: { reset: 'idle', pay: 'creating' },
  failed: { reset: 'idle', pay: 'creating' },
}

/** The phase this event leads to, or `null` if the machine forbids it here. */
export const nextPhase = (phase: CheckoutPhase, event: MachineEvent): CheckoutPhase | null =>
  TRANSITIONS[phase][event] ?? null

/** Nothing more will happen on its own once one of these is reached. */
export const isSettledPhase = (phase: CheckoutPhase): boolean =>
  phase === 'succeeded' || phase === 'declined' || phase === 'canceled' || phase === 'failed'

/** The shopper is waiting on us; the UI should be showing progress and blocking input. */
export const isBusyPhase = (phase: CheckoutPhase): boolean =>
  phase === 'preparing' ||
  phase === 'creating' ||
  phase === 'confirming' ||
  phase === 'action_running' ||
  phase === 'resuming' ||
  phase === 'polling'
