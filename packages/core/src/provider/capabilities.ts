// What a plugin can do, declared up front.
//
// Read this carefully before using it: capabilities exist for *validation and copy*, not
// for control flow. The engine checks at registration time that the host has a runner for
// everything a plugin might return, and the UI may use `instruments` to decide which
// fields to render. Nothing else may branch on this.
//
// In particular, never write `if (caps.authentication.includes('3ds2'))`. Whether a
// payment needs authentication is decided by the issuer at transaction time, and the only
// honest signal is the `PaymentAction` the provider actually returned.

import type { ActionSurface, PaymentActionKind } from '../domain/action'
import type { PaymentInstrumentKind } from '../domain/instrument'

export type AuthenticationKind = 'none' | '3ds1' | '3ds2' | 'otp' | 'sdk'

export interface ProviderCapabilities {
  readonly instruments: readonly PaymentInstrumentKind[]
  readonly actions: readonly PaymentActionKind[]
  readonly surfaces: readonly ActionSurface[]
  readonly authentication: readonly AuthenticationKind[]
  /** `eager`: the intent is created when the form mounts, not when the shopper submits. */
  readonly session: 'lazy' | 'eager'
  readonly cancel: boolean
  readonly poll: boolean
  readonly idempotency: 'header' | 'body' | 'none'
}
