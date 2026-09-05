// The next step a payment needs. This union - rather than a `requires3ds` flag - is what
// keeps the engine free of any particular protocol.

export type PaymentActionKind = 'redirect' | 'collect_fields' | 'sdk_handoff' | 'display' | 'poll'

export type ActionSurface = 'top' | 'iframe' | 'popup' | 'inline' | 'none'

/** How the runner will learn that the action finished. */
export type CompletionSpec =
  | { via: 'return_url' }
  | {
      via: 'post_message'
      origin: string
      type: string
      /**
       * Field in the message that carries the action id. Defaults to `actionId`; banks name
       * it `challengeId`, `MD` and so on, and the check still has to happen.
       */
      correlationField?: string
    }
  | { via: 'poll'; intervalMs: number; timeoutMs: number }
  | { via: 'sdk_callback' }

interface ActionBase {
  /** Correlation id. Evidence carrying a different one is rejected. */
  readonly id: string
  /** Copywriting and telemetry only - never a branch in the checkout logic. */
  readonly purpose: 'authenticate' | 'authorize' | 'collect'
  readonly completion: CompletionSpec
  readonly expiresAt?: string
}

export type PaymentAction =
  | (ActionBase & {
      kind: 'redirect'
      surface: Exclude<ActionSurface, 'inline' | 'none'>
      url: string
      method: 'GET' | 'POST'
      /** Form body: a 3-D Secure 2 `creq`, a 3-D Secure 1 `PaReq`/`MD`, HPP parameters. */
      fields?: Readonly<Record<string, string>>
      /**
       * Field the runner fills with an absolute return URL (`TermUrl`, `returnUrl`, ...).
       * Only the host knows its own base path, so only the host can build it.
       */
      returnUrlField?: string
    })
  | (ActionBase & {
      kind: 'collect_fields'
      surface: 'inline'
      url: string
      /** Expected origin of the field iframe; messages from anywhere else are dropped. */
      origin: string
      fields: readonly ('number' | 'exp' | 'cvc' | 'holder')[]
      /** CSS custom properties forwarded into the provider's iframe so it matches the page. */
      theme?: Readonly<Record<string, string>>
    })
  | (ActionBase & {
      kind: 'sdk_handoff'
      surface: 'none'
      /** Key of the SDK adapter registered with the runtime. */
      sdk: string
      scriptUrl?: string
      integrity?: string
      params: Readonly<Record<string, unknown>>
    })
  | (ActionBase & {
      kind: 'display'
      surface: 'inline'
      /**
       * Show the shopper something and wait for the money.
       *
       * This is how most of the world outside cards pays: a QR code for PIX or UPI, a six
       * digit code for BLIK, a slip number for Konbini or Boleto. Nothing on this page can
       * tell when it is done, so `completion` is always `poll`.
       */
      format: 'qr' | 'code' | 'instructions'
      /** The payload itself: the QR string, the code, the reference number. */
      value: string
      /** A rendered QR, when the provider draws one. The kit does not encode QR codes. */
      imageUrl?: string
      /** Opens the shopper's bank or wallet app, on a phone. */
      deeplink?: string
      /** One line saying what to do with the value above. */
      instructions?: string
      completion: Extract<CompletionSpec, { via: 'poll' }>
    })
  | (ActionBase & { kind: 'poll'; surface: 'none' })
