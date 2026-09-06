// The web half: turns engine events into messages a native host can read.
//
// It only uses the engine public event API, so nothing in @checkout-kit/core knows this
// exists. Every payload is built field by field from a whitelist - never spread from a
// snapshot - which is what keeps card data out of a channel we do not control.

import {
  PHASE_TO_UI_STATE,
  type CheckoutEngine,
  type CheckoutPhase,
  type PaymentAction,
} from '@checkout-kit/core'
import {
  BRIDGE_VERSION,
  parseBridgeCommand,
  type BridgeCommand,
  type BridgeEvent,
} from './protocol'

export * from './protocol'

export interface BridgeTarget {
  postMessage(data: string): void
}

export interface WebViewBridgeOptions {
  /** Defaults to `window.ReactNativeWebView`. Injectable for tests. */
  readonly target?: BridgeTarget | null
  readonly sessionId?: string
  /** Reports the document height so the host can size the WebView. */
  readonly reportHeight?: boolean
  readonly onCommand?: (command: BridgeCommand) => void
}

export interface WebViewBridge {
  /** True when there is a native host listening. */
  readonly isHosted: boolean
  send(event: BridgeEvent): void
  stop(): void
}

interface HostWindow extends Window {
  ReactNativeWebView?: BridgeTarget
}

const detectTarget = (): BridgeTarget | null => {
  if (typeof window === 'undefined') return null
  const host = (window as HostWindow).ReactNativeWebView
  return typeof host?.postMessage === 'function' ? host : null
}

const actionPayload = (action: PaymentAction) => ({
  actionId: action.id,
  kind: action.kind,
  surface: action.surface,
  purpose: action.purpose,
  // Only a redirect has somewhere to go, and only then may the host take it elsewhere.
  url: action.kind === 'redirect' ? action.url : undefined,
})

export const createWebViewBridge = (
  engine: CheckoutEngine,
  options: WebViewBridgeOptions = {},
): WebViewBridge => {
  const target = options.target === undefined ? detectTarget() : options.target
  const sessionId = options.sessionId ?? crypto.randomUUID()

  // No host: everything below turns into nothing, so the same build runs in a browser.
  if (!target) {
    return { isHosted: false, send: () => {}, stop: () => {} }
  }

  let sequence = 0
  const envelope = <T extends BridgeEvent['type'], P>(type: T, payload: P) =>
    ({
      source: 'checkout-kit' as const,
      v: BRIDGE_VERSION,
      id: `${sessionId}:${++sequence}`,
      sessionId,
      ts: Date.now(),
      type,
      payload,
    }) as BridgeEvent

  const send = (event: BridgeEvent): void => {
    target.postMessage(JSON.stringify(event))
  }

  const emit = <T extends BridgeEvent['type'], P>(type: T, payload: P): void => {
    send(envelope(type, payload))
  }

  const stops: (() => void)[] = []

  let previousPhase: CheckoutPhase | null = null
  stops.push(
    engine.on('phase_changed', (event) => {
      emit('PAYMENT_STATE_CHANGED', {
        state: PHASE_TO_UI_STATE[event.phase],
        phase: event.phase,
        previousPhase,
      })
      previousPhase = event.phase
    }),
  )

  stops.push(
    engine.on('intent_created', ({ intent }) => {
      emit('PAYMENT_INTENT_CREATED', {
        intentId: intent.id,
        amount: intent.amount,
        currency: intent.currency,
        providerId: intent.providerId,
      })
    }),
  )

  stops.push(
    engine.on('action_required', ({ action }) => {
      emit('PAYMENT_REQUIRES_ACTION', actionPayload(action))
    }),
  )

  stops.push(
    engine.on('action_started', ({ action }) => {
      emit('PAYMENT_ACTION_STARTED', actionPayload(action))
    }),
  )

  stops.push(
    engine.on('action_finished', ({ action }) => {
      emit('PAYMENT_ACTION_FINISHED', actionPayload(action))
    }),
  )

  stops.push(
    engine.on('result', ({ result }) => {
      switch (result.status) {
        case 'succeeded':
          emit('PAYMENT_SUCCEEDED', {
            intentId: result.intent.id,
            amount: result.intent.amount,
            currency: result.intent.currency,
          })
          return
        case 'declined':
          emit('PAYMENT_DECLINED', {
            intentId: result.intent.id,
            code: result.error.code,
            message: result.error.message,
          })
          return
        case 'error':
          if (result.error.code === 'canceled') {
            emit('PAYMENT_CANCELLED', {
              intentId: result.intent?.id ?? null,
              reason: result.error.code,
            })
            return
          }
          emit('PAYMENT_FAILED', { code: result.error.code, message: result.error.message })
          return
        default:
          return
      }
    }),
  )

  const handleCommand = (event: MessageEvent | Event): void => {
    const data = (event as MessageEvent).data
    const parsed = parseBridgeCommand(data)
    if (!parsed.ok) return

    const command = parsed.message
    switch (command.type) {
      case 'PAYMENT_CANCEL':
        void engine.abort('user')
        break
      case 'PAYMENT_RETRY':
        engine.reset()
        break
      case 'PAYMENT_RESUME':
        void engine.hydrate(command.payload.params)
        break
      case 'PAYMENT_SET_THEME':
        document.documentElement
          .querySelector('.ck-root')
          ?.setAttribute('data-ck-theme', command.payload.theme)
        break
      case 'PAYMENT_PING':
        break
    }

    options.onCommand?.(command)
  }

  // Android delivers these on `window`, older iOS on `document`.
  window.addEventListener('message', handleCommand)
  document.addEventListener('message', handleCommand)
  stops.push(() => {
    window.removeEventListener('message', handleCommand)
    document.removeEventListener('message', handleCommand)
  })

  if (options.reportHeight && typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      emit('PAYMENT_HEIGHT_CHANGED', { height: document.documentElement.scrollHeight })
    })
    observer.observe(document.documentElement)
    stops.push(() => observer.disconnect())
  }

  const snapshot = engine.getSnapshot()
  emit('PAYMENT_READY', {
    bridgeVersion: BRIDGE_VERSION,
    providerId: snapshot.providerId,
    instruments: snapshot.capabilities?.instruments ?? [],
    actions: snapshot.capabilities?.actions ?? [],
  })

  return {
    isHosted: true,
    send,
    stop: () => {
      for (const stop of stops) stop()
    },
  }
}
