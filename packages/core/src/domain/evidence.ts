// What a runner brings back from an action, unchanged. The runner proves where it came
// from (origin, action id); the plugin decides what it means.
//
// Evidence is a hint. Money is only confirmed by re-reading the intent.

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
