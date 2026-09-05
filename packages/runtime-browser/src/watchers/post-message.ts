// The only `message` listener in the checkout. Three checks: the origin the provider
// declared, the message type, and the action id. The last one stops a stale message from
// an earlier attempt settling the current payment.

import type { ActionEvidence } from '@checkout-kit/core'

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
