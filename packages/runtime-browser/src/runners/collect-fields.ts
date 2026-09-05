// The provider's own card fields, in its own frame. What crosses back is a token; the card
// number never enters our page.

import type { ActionEvidence, ActionRunner, PaymentAction, RunnerContext } from '@checkout-kit/core'
import { awaitPostMessage } from '../watchers/post-message'

type CollectFieldsAction = Extract<PaymentAction, { kind: 'collect_fields' }>

export interface CollectFieldsRunnerOptions {
  readonly frameTitle?: (action: CollectFieldsAction) => string
  /**
   * No `allow-forms` and no `allow-top-navigation`: the field frame talks to its provider
   * with fetch and answers with postMessage, so it has no business submitting anything or
   * moving the page underneath it.
   */
  readonly sandbox?: string
}

const DEFAULT_SANDBOX = 'allow-scripts allow-same-origin'

const buildUrl = (action: CollectFieldsAction, returnUrl: string): string => {
  const url = new URL(action.url, returnUrl)
  url.searchParams.set('actionId', action.id)
  url.searchParams.set('fields', action.fields.join(','))
  for (const [name, value] of Object.entries(action.theme ?? {})) {
    url.searchParams.set(`theme.${name}`, value)
  }
  return url.toString()
}

export const createCollectFieldsRunner = (
  options: CollectFieldsRunnerOptions = {},
): ActionRunner<'collect_fields'> => ({
  kind: 'collect_fields',
  surfaces: ['inline'],

  run: async (action, ctx: RunnerContext): Promise<ActionEvidence> => {
    const mount = ctx.mount?.element
    if (!(mount instanceof HTMLElement)) {
      return {
        via: 'aborted',
        actionId: action.id,
        reason: 'runner_error',
        cause: new Error('Hosted fields need somewhere to render; no mount point was given.'),
      }
    }

    const frame = document.createElement('iframe')
    frame.title = options.frameTitle?.(action) ?? 'Card details'
    frame.referrerPolicy = 'no-referrer'
    frame.setAttribute('sandbox', options.sandbox ?? DEFAULT_SANDBOX)
    frame.style.width = '100%'
    frame.style.height = '100%'
    frame.style.border = '0'
    frame.src = buildUrl(action, ctx.returnUrl)

    // Listening before the frame is attached: it may answer as soon as it loads.
    const evidence = awaitPostMessage({
      actionId: action.id,
      origin: action.origin,
      type: action.completion.via === 'post_message' ? action.completion.type : 'ck-fields-token',
      correlationField:
        action.completion.via === 'post_message' ? action.completion.correlationField : undefined,
      signal: ctx.signal,
      deadline: ctx.deadline,
    })

    mount.append(frame)
    ctx.report({ stage: 'collecting', detail: action.origin })

    try {
      return await evidence
    } finally {
      frame.remove()
    }
  },
})
