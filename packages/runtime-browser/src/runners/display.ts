// Shows the shopper what they need - a QR code, a short code, a payment slip - and waits.
//
// Nothing here can tell when the money has arrived: the shopper is paying in their banking
// app. The engine polls the provider alongside this runner, and whichever answers first
// ends the action. So this promise settles only when the shopper gives up or time runs out.

import type { ActionEvidence, ActionRunner, PaymentAction, RunnerContext } from '@checkout-kit/core'

type DisplayAction = Extract<PaymentAction, { kind: 'display' }>

export interface DisplayRunnerText {
  readonly copy: string
  readonly copied: string
  readonly openApp: string
  /** Alt text for a provider-rendered QR image. */
  readonly qrAlt: string
}

export interface DisplayRunnerOptions {
  /** Every string the runner puts on the page, so it can be translated. */
  readonly text?: Partial<DisplayRunnerText>
  /** Prefix for the class names, in case they clash with the host's. */
  readonly classPrefix?: string
}

const DEFAULT_TEXT: DisplayRunnerText = {
  copy: 'Copy',
  copied: 'Copied',
  openApp: 'Open your bank app',
  qrAlt: 'QR code for this payment',
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export const createDisplayRunner = (
  options: DisplayRunnerOptions = {},
): ActionRunner<'display'> => {
  const text = { ...DEFAULT_TEXT, ...options.text }
  const prefix = options.classPrefix ?? 'ck-display'

  const render = (action: DisplayAction): HTMLElement => {
    const root = el('div', prefix)
    root.dataset.format = action.format

    // A provider that draws its own QR gives a URL for it. Encoding one here would mean
    // shipping a QR library to every consumer for the sake of a few integrations.
    if (action.imageUrl) {
      const image = el('img', `${prefix}__qr`)
      image.src = action.imageUrl
      image.alt = text.qrAlt
      image.decoding = 'async'
      root.append(image)
    }

    if (action.instructions) {
      root.append(el('p', `${prefix}__instructions`, action.instructions))
    }

    // Always shown, even next to a QR: a shopper paying on the same phone cannot scan it.
    const value = el('code', `${prefix}__value`, action.value)
    root.append(value)

    const copy = el('button', `${prefix}__copy`, text.copy)
    copy.type = 'button'
    // The label is the only feedback a copy gives, so it has to be announced too.
    copy.setAttribute('aria-live', 'polite')
    copy.addEventListener('click', () => {
      void navigator.clipboard?.writeText(action.value).then(() => {
        copy.textContent = text.copied
      })
    })
    root.append(copy)

    if (action.deeplink) {
      const link = el('a', `${prefix}__app`, text.openApp)
      link.href = action.deeplink
      link.rel = 'noopener noreferrer'
      root.append(link)
    }

    return root
  }

  return {
    kind: 'display',
    surfaces: ['inline'],

    run: async (action, ctx: RunnerContext): Promise<ActionEvidence> => {
      const mount = ctx.mount?.element
      if (!(mount instanceof HTMLElement)) {
        return {
          via: 'aborted',
          actionId: action.id,
          reason: 'runner_error',
          cause: new Error('A displayed payment needs somewhere to render; no mount was given.'),
        }
      }

      const node = render(action)
      mount.append(node)
      ctx.report({ stage: 'displayed', detail: action.format })

      try {
        return await new Promise<ActionEvidence>((resolve) => {
          const done = (reason: 'user' | 'timeout') => {
            resolve({ via: 'aborted', actionId: action.id, reason })
          }

          ctx.signal.addEventListener('abort', () => done('user'), { once: true })

          const left = ctx.deadline - Date.now()
          if (left <= 0) return done('timeout')
          const timer = setTimeout(() => done('timeout'), left)
          ctx.signal.addEventListener('abort', () => clearTimeout(timer), { once: true })
        })
      } finally {
        node.remove()
      }
    },
  }
}
