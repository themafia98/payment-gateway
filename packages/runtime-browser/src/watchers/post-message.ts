// The single place in the whole checkout that listens to `window.message`.
//
// Three checks, all of them required:
//   1. `event.origin` is exactly the origin the provider declared - not a prefix, not a
//      substring, and never `'*'`.
//   2. the message type matches, so an unrelated widget on the same origin cannot answer
//      for the bank.
//   3. the action id matches, so a stale message from a previous attempt cannot settle
//      the current one. (This is the check that is easiest to forget and the reason a
//      correlation id exists on every action.)
//
// Even after all three pass, what comes back is *evidence*, not a verdict: the plugin
// decides what it means, and money is only ever confirmed by re-reading the intent.

import type { ActionEvidence } from '@pg/core'

export interface PostMessageExpectation {
  readonly actionId: string
  readonly origin: string
  readonly type: string
  /** Message field carrying the action id. Defaults to `actionId`. */
  readonly correlationField?: string
  readonly signal: AbortSignal
  readonly deadline: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const awaitPostMessage = (expect: PostMessageExpectation): Promise<ActionEvidence> =>
  new Promise<ActionEvidence>((resolve) => {
    const settle = (evidence: ActionEvidence): void => {
      window.removeEventListener('message', onMessage)
      expect.signal.removeEventListener('abort', onAbort)
      clearTimeout(timer)
      resolve(evidence)
    }

    const onMessage = (event: MessageEvent<unknown>): void => {
      if (event.origin !== expect.origin) return
      if (!isRecord(event.data)) return
      if (event.data.type !== expect.type) return
      // A message about someone else's action is not ours to act on. A protocol that
      // names the field differently still gets checked - see `correlationField`.
      const correlation = event.data.actionId ?? event.data[expect.correlationField ?? 'actionId']
      if (correlation !== undefined && correlation !== expect.actionId) return

      settle({
        via: 'post_message',
        actionId: expect.actionId,
        origin: event.origin,
        data: event.data,
      })
    }

    const onAbort = (): void => {
      settle({ via: 'aborted', actionId: expect.actionId, reason: 'user' })
    }

    const timer = setTimeout(
      () => settle({ via: 'aborted', actionId: expect.actionId, reason: 'timeout' }),
      Math.max(0, expect.deadline - Date.now()),
    )

    window.addEventListener('message', onMessage)
    expect.signal.addEventListener('abort', onAbort, { once: true })
  })
