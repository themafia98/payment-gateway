// What a plugin can do.
//
// Use it to check the host's setup and to decide what to render. Never use it to decide
// what a payment needs: only the action a provider returned can say that.

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
