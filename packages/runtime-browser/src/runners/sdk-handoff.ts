// Handing the payment to someone else's JavaScript.
//
// Wallets work this way: a script from the wallet's own domain puts up its own sheet, the
// shopper approves with a fingerprint or a face, and what comes back is a payload the
// provider can charge. Our page never sees a card, never draws the sheet, and cannot
// influence what happens inside it.
//
// Two things this runner takes seriously. Scripts are loaded once per URL, because loading
// a wallet SDK twice is how you end up with two conflicting globals. And an `integrity`
// hash is passed through when the provider supplies one - the whole arrangement rests on
// executing a third party's code, and that is worth pinning.

import type { ActionEvidence, ActionRunner, PaymentAction, RunnerContext } from '@pg/core'

type SdkHandoffAction = Extract<PaymentAction, { kind: 'sdk_handoff' }>

export interface SdkAdapter {
  /** Matches `action.sdk`. */
  readonly sdk: string
  /**
   * Drive the loaded SDK and return whatever the provider expects to charge.
   *
   * Throwing means the shopper dismissed it; the engine reports that as an abandoned
   * payment rather than a failure.
   */
  request(params: Readonly<Record<string, unknown>>, signal: AbortSignal): Promise<unknown>
}

export interface SdkHandoffRunnerOptions {
  readonly adapters?: readonly SdkAdapter[]
  readonly loadTimeoutMs?: number
}

const loading = new Map<string, Promise<void>>()

const loadScript = (
  url: string,
  integrity: string | undefined,
  timeoutMs: number,
): Promise<void> => {
  const existing = loading.get(url)
  if (existing) return existing

  const started = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.async = true
    if (integrity) {
      script.integrity = integrity
      // Required for the browser to check the hash at all on a cross-origin script.
      script.crossOrigin = 'anonymous'
    }

    const timer = setTimeout(() => {
      script.remove()
      reject(new Error(`The payment SDK at ${url} did not load in time.`))
    }, timeoutMs)

    script.addEventListener('load', () => {
      clearTimeout(timer)
      resolve()
    })
    script.addEventListener('error', () => {
      clearTimeout(timer)
      script.remove()
      reject(new Error(`The payment SDK at ${url} could not be loaded.`))
    })

    document.head.append(script)
  })

  // A failed load must not be remembered as done; the next attempt should try again.
  loading.set(
    url,
    started.catch((cause: unknown) => {
      loading.delete(url)
      throw cause
    }),
  )
  return loading.get(url) ?? started
}

export const createSdkHandoffRunner = (
  options: SdkHandoffRunnerOptions = {},
): ActionRunner<'sdk_handoff'> => {
  const adapters = new Map((options.adapters ?? []).map((adapter) => [adapter.sdk, adapter]))

  return {
    kind: 'sdk_handoff',
    surfaces: ['none'],

    run: async (action: SdkHandoffAction, ctx: RunnerContext): Promise<ActionEvidence> => {
      const adapter = adapters.get(action.sdk)
      if (!adapter) {
        return {
          via: 'aborted',
          actionId: action.id,
          reason: 'runner_error',
          cause: new Error(
            `No adapter registered for the "${action.sdk}" SDK. Pass one to createBrowserRuntime.`,
          ),
        }
      }

      try {
        if (action.scriptUrl) {
          ctx.report({ stage: 'loading-sdk', detail: action.scriptUrl })
          await loadScript(action.scriptUrl, action.integrity, options.loadTimeoutMs ?? 15_000)
        }

        ctx.report({ stage: 'awaiting-shopper', detail: action.sdk })
        const payload = await adapter.request(action.params, ctx.signal)

        return { via: 'sdk_callback', actionId: action.id, payload }
      } catch (cause) {
        // A wallet sheet the shopper closes is the ordinary case, not an incident.
        return { via: 'aborted', actionId: action.id, reason: 'user', cause }
      }
    },
  }
}
