// Card fields rendered by the provider, inside its own frame.
//
// The difference from a redirect is not the iframe - it is what crosses back. Here the
// frame is a form the shopper types into, and what it sends out is a token: a reference
// the provider can charge and this page can do nothing with. The card number is never in
// our document, never in our memory, and never in a request we make.
//
// The frame gets a `theme` of CSS custom properties so it can look like it belongs to the
// page it is embedded in. That is styling, not access - the parent still cannot read a
// single character of what is typed inside it.

import type { ActionEvidence, ActionRunner, PaymentAction, RunnerContext } from '@pg/core'
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
      type: action.completion.via === 'post_message' ? action.completion.type : 'pg-fields-token',
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
