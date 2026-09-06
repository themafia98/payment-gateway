// The React Native side. No DOM, no engine, no react-native import either - it takes the
// string a WebView handed it and gives back something typed.

import { parseBridgeEvent, type BridgeEvent, type BridgeEventType } from '../protocol'

export type BridgeEventHandlers = {
  [T in BridgeEventType]?: (event: Extract<BridgeEvent, { type: T }>) => void
} & {
  /** Called for every event, after the specific handler. */
  onEvent?: (event: BridgeEvent) => void
  /** Something arrived that was not ours, or was too new to read. */
  onUnknown?: (reason: 'not_ours' | 'malformed' | 'unsupported_version', raw: unknown) => void
}

export interface CheckoutMessageHandler {
  (raw: unknown): void
  /** The session of the last event seen. Anything older is from a WebView since reloaded. */
  readonly sessionId: string | null
}

/**
 * Wrap this in the WebView `onMessage`:
 *
 *   const handle = createCheckoutMessageHandler({ PAYMENT_SUCCEEDED: (e) => … })
 *   <WebView onMessage={(e) => handle(e.nativeEvent.data)} />
 */
export const createCheckoutMessageHandler = (
  handlers: BridgeEventHandlers,
): CheckoutMessageHandler => {
  let sessionId: string | null = null

  const handle = (raw: unknown): void => {
    const result = parseBridgeEvent(raw)
    if (!result.ok) {
      handlers.onUnknown?.(result.reason, raw)
      return
    }

    const event = result.message
    sessionId = event.sessionId

    const handler = handlers[event.type] as ((value: BridgeEvent) => void) | undefined
    handler?.(event)
    handlers.onEvent?.(event)
  }

  return Object.defineProperty(handle, 'sessionId', {
    get: () => sessionId,
  }) as CheckoutMessageHandler
}

export type NavigationDecision = 'allow' | 'external' | 'return' | 'block'

export interface NavigationPolicy {
  /** Origin and path prefix, e.g. "https://pay.example.com/checkout". */
  readonly allow: readonly string[]
  /** Hosts that should open in the system browser rather than the WebView. */
  readonly openExternally?: readonly string[]
  /** Scheme of the deep link the payment comes back on, e.g. "myapp". */
  readonly returnScheme?: string
}

const matches = (url: URL, prefix: string): boolean => {
  let allowed: URL
  try {
    allowed = new URL(prefix)
  } catch {
    return false
  }

  // Origin compared for equality, never as a substring: `https://evil.test/#https://bank.test`
  // passes any check that looks at the whole URL as text.
  return url.origin === allowed.origin && url.pathname.startsWith(allowed.pathname)
}

/**
 * What a WebView is allowed to navigate to. Wire it into
 * `onShouldStartLoadWithRequest` - without one, any page the checkout links to gets to run
 * inside the app.
 */
export const createNavigationPolicy = (
  policy: NavigationPolicy,
): { decide: (url: string) => NavigationDecision } => ({
  decide: (raw: string): NavigationDecision => {
    let url: URL
    try {
      url = new URL(raw)
    } catch {
      return 'block'
    }

    if (policy.returnScheme && url.protocol === `${policy.returnScheme}:`) return 'return'
    if (url.protocol === 'mailto:' || url.protocol === 'tel:') return 'external'
    // Everything about a payment is https. A plain-http hop is either a mistake or an attack.
    if (url.protocol !== 'https:') return 'block'

    if (policy.allow.some((prefix) => matches(url, prefix))) return 'allow'
    if (policy.openExternally?.some((prefix) => matches(url, prefix))) return 'external'

    return 'block'
  },
})

const SLASH = 47

/** Not `/^\/+|\/+$/`: that one is quadratic on a string of slashes, and the input is a URL. */
const trimSlashes = (value: string): string => {
  let start = 0
  let end = value.length

  while (start < end && value.charCodeAt(start) === SLASH) start += 1
  while (end > start && value.charCodeAt(end - 1) === SLASH) end -= 1

  return value.slice(start, end)
}

/**
 * Reads the query off a return deep link. Feed the result back in as `PAYMENT_RESUME`, and
 * the checkout hydrates exactly as it would after a browser redirect.
 */
export const parseReturnDeepLink = (
  raw: string,
  options: { readonly scheme: string; readonly path?: string },
): Record<string, string> | null => {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  if (url.protocol !== `${options.scheme}:`) return null

  if (options.path) {
    // A custom-scheme URL puts the first segment in `host`, so both spellings are checked.
    const path = trimSlashes(`${url.host}${url.pathname}`)
    if (path !== trimSlashes(options.path)) return null
  }

  return Object.fromEntries(url.searchParams)
}
