// Sends the browser to the provider, on whichever surface the host chose.
//
// One runner covers both surfaces because they are the same operation - build a form, post
// it - differing only in where the result lands and how it comes back:
//
//   iframe  the form targets a sandboxed frame inside our page; the provider reports back
//           with postMessage, and the shopper never leaves the checkout
//   top     the form targets the whole window; the page is destroyed, the provider sends
//           the browser to `returnUrl`, and the evidence is read from the query string
//           after reload (see `hydrate` on the engine)
//
// A GET action skips the form entirely and just navigates.

import type { ActionEvidence, ActionRunner, PaymentAction, RunnerContext } from '@pg/core'
import { awaitPostMessage } from '../watchers/post-message'

type RedirectAction = Extract<PaymentAction, { kind: 'redirect' }>

export interface RedirectRunnerOptions {
  /** Accessible name for the frame the provider is rendered in. */
  readonly frameTitle?: (action: RedirectAction) => string
  /**
   * Sandbox tokens for that frame. `allow-same-origin` is present because the provider's
   * page needs its own cookies and storage to work at all; it is safe here only because
   * the frame is cross-origin. Top navigation and popups stay denied deliberately.
   */
  readonly sandbox?: string
}

const DEFAULT_SANDBOX = 'allow-scripts allow-forms allow-same-origin'

const defaultFrameTitle = (action: RedirectAction): string =>
  action.purpose === 'authenticate' ? 'Payment authentication' : 'Payment'

const buildForm = (action: RedirectAction, target: string, returnUrl: string): HTMLFormElement => {
  const form = document.createElement('form')
  form.method = action.method
  form.action = action.url
  form.target = target
  form.hidden = true

  const fields = { ...action.fields }
  // Only the host knows its own base path, so the absolute return URL is filled in here
  // rather than by the provider.
  if (action.returnUrlField) fields[action.returnUrlField] = returnUrl

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.append(input)
  }

  return form
}

const runInIframe = async (
  action: RedirectAction,
  ctx: RunnerContext,
  options: RedirectRunnerOptions,
): Promise<ActionEvidence> => {
  const mount = ctx.mount?.element
  if (!(mount instanceof HTMLElement)) {
    return {
      via: 'aborted',
      actionId: action.id,
      reason: 'runner_error',
      cause: new Error('An iframe action needs a mount point; none was provided.'),
    }
  }

  if (action.completion.via !== 'post_message') {
    return {
      via: 'aborted',
      actionId: action.id,
      reason: 'runner_error',
      cause: new Error(
        `An iframe action must complete via postMessage, but this one declares ` +
          `"${action.completion.via}".`,
      ),
    }
  }

  const name = `pg-action-${action.id}`
  const frame = document.createElement('iframe')
  frame.name = name
  frame.title = (options.frameTitle ?? defaultFrameTitle)(action)
  frame.referrerPolicy = 'no-referrer'
  frame.setAttribute('sandbox', options.sandbox ?? DEFAULT_SANDBOX)
  frame.style.width = '100%'
  frame.style.height = '100%'
  frame.style.border = '0'
  mount.append(frame)

  // Listening before submitting: a fast provider can answer before `submit()` returns.
  const evidence = awaitPostMessage({
    actionId: action.id,
    origin: action.completion.origin,
    type: action.completion.type,
    correlationField: action.completion.correlationField,
    signal: ctx.signal,
    deadline: ctx.deadline,
  })

  if (action.method === 'GET') {
    frame.src = action.url
  } else {
    const form = buildForm(action, name, ctx.returnUrl)
    document.body.append(form)
    ctx.report({ stage: 'submitting', detail: action.url })
    form.submit()
    form.remove()
  }

  try {
    return await evidence
  } finally {
    frame.remove()
  }
}

const runInTopWindow = (action: RedirectAction, ctx: RunnerContext): Promise<ActionEvidence> => {
  ctx.report({ stage: 'leaving', detail: action.url })

  if (action.method === 'GET') {
    // Resolved against the current page: a provider is entitled to hand back a relative
    // URL, and `new URL` alone would throw on one.
    const url = new URL(action.url, window.location.href)
    for (const [name, value] of Object.entries(action.fields ?? {})) {
      url.searchParams.set(name, value)
    }
    if (action.returnUrlField) url.searchParams.set(action.returnUrlField, ctx.returnUrl)
    window.location.assign(url.toString())
  } else {
    const form = buildForm(action, '_top', ctx.returnUrl)
    document.body.append(form)
    form.submit()
  }

  // This page is on its way out. Resolving would only race the unload; the payment is
  // picked back up by `hydrate()` after the provider returns the browser to us.
  return new Promise<ActionEvidence>(() => {})
}

export const createRedirectRunner = (
  options: RedirectRunnerOptions = {},
): ActionRunner<'redirect'> => ({
  kind: 'redirect',
  surfaces: ['iframe', 'top'],
  run: (action, ctx) =>
    ctx.surface === 'top' ? runInTopWindow(action, ctx) : runInIframe(action, ctx, options),
})
