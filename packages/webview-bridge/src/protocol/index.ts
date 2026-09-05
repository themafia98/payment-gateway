// The contract between a checkout running in a WebView and the app hosting it.
//
// Types only, no DOM and no engine: this half has to compile in a React Native bundle.

import type { CheckoutPhase, PaymentUiState } from '@checkout-kit/core'

export const BRIDGE_VERSION = 1

/** Every message carries this. `source` is the discriminator - a WebView receives everything. */
export interface BridgeEnvelope<TType extends string, TPayload> {
  readonly source: 'checkout-kit'
  readonly v: number
  readonly id: string
  /** One checkout attempt. Lets the host drop messages from a WebView it has reloaded. */
  readonly sessionId: string
  /** Set on a reply, to the id of the command it answers. */
  readonly correlationId?: string
  readonly ts: number
  readonly type: TType
  readonly payload: TPayload
}

export interface PaymentReadyPayload {
  readonly bridgeVersion: number
  readonly providerId: string | null
  readonly instruments: readonly string[]
  readonly actions: readonly string[]
}

export interface PaymentStateChangedPayload {
  readonly state: PaymentUiState
  readonly phase: CheckoutPhase
  readonly previousPhase: CheckoutPhase | null
}

export interface PaymentIntentCreatedPayload {
  readonly intentId: string
  readonly amount: number
  readonly currency: string
  readonly providerId: string
}

export interface PaymentActionPayload {
  readonly actionId: string
  readonly kind: string
  readonly surface: string
  readonly purpose: string
  /** Only for a redirect, so the host can decide to open it outside the WebView. */
  readonly url?: string
}

export interface PaymentSucceededPayload {
  readonly intentId: string
  readonly amount: number
  readonly currency: string
}

export interface PaymentDeclinedPayload {
  readonly intentId: string | null
  readonly code?: string
  readonly message: string
}

export interface PaymentCanceledPayload {
  readonly intentId: string | null
  readonly reason: string
}

export interface PaymentFailedPayload {
  readonly code?: string
  readonly message: string
}

export interface PaymentHeightPayload {
  readonly height: number
}

export type BridgeEvent =
  | BridgeEnvelope<'PAYMENT_READY', PaymentReadyPayload>
  | BridgeEnvelope<'PAYMENT_STATE_CHANGED', PaymentStateChangedPayload>
  | BridgeEnvelope<'PAYMENT_INTENT_CREATED', PaymentIntentCreatedPayload>
  | BridgeEnvelope<'PAYMENT_REQUIRES_ACTION', PaymentActionPayload>
  | BridgeEnvelope<'PAYMENT_ACTION_STARTED', PaymentActionPayload>
  | BridgeEnvelope<'PAYMENT_ACTION_FINISHED', PaymentActionPayload>
  | BridgeEnvelope<'PAYMENT_SUCCEEDED', PaymentSucceededPayload>
  | BridgeEnvelope<'PAYMENT_DECLINED', PaymentDeclinedPayload>
  | BridgeEnvelope<'PAYMENT_CANCELLED', PaymentCanceledPayload>
  | BridgeEnvelope<'PAYMENT_FAILED', PaymentFailedPayload>
  | BridgeEnvelope<'PAYMENT_HEIGHT_CHANGED', PaymentHeightPayload>

export type BridgeEventType = BridgeEvent['type']

export type BridgeCommand =
  | BridgeEnvelope<'PAYMENT_CANCEL', Record<string, never>>
  | BridgeEnvelope<'PAYMENT_RETRY', Record<string, never>>
  /** Query parameters collected outside the WebView, e.g. from a return deep link. */
  | BridgeEnvelope<'PAYMENT_RESUME', { readonly params: Readonly<Record<string, string>> }>
  | BridgeEnvelope<'PAYMENT_SET_THEME', { readonly theme: 'light' | 'dark' | 'auto' }>
  | BridgeEnvelope<'PAYMENT_PING', Record<string, never>>

export type BridgeCommandType = BridgeCommand['type']

export type ParseResult<T> =
  | { readonly ok: true; readonly message: T }
  | { readonly ok: false; readonly reason: 'not_ours' | 'malformed' | 'unsupported_version' }

const isEnvelope = (value: unknown): value is BridgeEnvelope<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>

  return (
    candidate.source === 'checkout-kit' &&
    typeof candidate.v === 'number' &&
    typeof candidate.id === 'string' &&
    typeof candidate.sessionId === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.payload === 'object' &&
    candidate.payload !== null
  )
}

const parse = <T extends BridgeEnvelope<string, unknown>>(raw: unknown): ParseResult<T> => {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return { ok: false, reason: 'not_ours' }
    }
  }

  if (!isEnvelope(value)) return { ok: false, reason: 'not_ours' }
  // A newer WebView than the app: say so rather than acting on half of it.
  if (value.v > BRIDGE_VERSION) return { ok: false, reason: 'unsupported_version' }

  return { ok: true, message: value as T }
}

/** Host side: what came out of a WebView `onMessage`. */
export const parseBridgeEvent = (raw: unknown): ParseResult<BridgeEvent> => parse<BridgeEvent>(raw)

/** Web side: what the host sent in. */
export const parseBridgeCommand = (raw: unknown): ParseResult<BridgeCommand> =>
  parse<BridgeCommand>(raw)
