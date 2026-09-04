// What a runner brings back from an action. Deliberately raw: the runner proves *where*
// the data came from (origin, action id), the plugin decides what it *means*. Keeping the
// interpretation inside the plugin is what stops rules like `transStatus === 'Y'` from
// leaking into UI components.
//
// Evidence is a hint, never the truth. Money is confirmed by re-reading the intent.

export type ActionEvidence =
  | {
      via: 'post_message'
      actionId: string
      origin: string
      data: Readonly<Record<string, unknown>>
    }
  | { via: 'return_url'; actionId: string; params: Readonly<Record<string, string>> }
  | { via: 'sdk_callback'; actionId: string; payload: unknown }
  | { via: 'poll'; actionId: string }
  | {
      via: 'aborted'
      actionId: string
      reason: 'user' | 'timeout' | 'runner_error'
      cause?: unknown
    }
