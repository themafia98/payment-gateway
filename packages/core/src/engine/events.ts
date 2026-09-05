// One-off notifications: analytics, logging, mirroring into a host's store. State that
// says "where are we now" belongs in the snapshot instead.

import type { ActionSurface, PaymentAction } from '../domain/action'
import type { ActionEvidence } from '../domain/evidence'
import type { PaymentError, PaymentIntent } from '../domain/intent'
import type { PaymentResult } from '../domain/result'
import type { CheckoutPhase } from './machine'

export type EngineEvent =
  | { type: 'phase_changed'; phase: CheckoutPhase; previous: CheckoutPhase }
  | { type: 'provider_changed'; providerId: string }
  | { type: 'intent_created'; intent: PaymentIntent }
  | { type: 'action_required'; action: PaymentAction }
  | { type: 'action_started'; action: PaymentAction; surface: ActionSurface }
  | { type: 'action_finished'; action: PaymentAction; evidence: ActionEvidence }
  | { type: 'result'; result: PaymentResult }
  | { type: 'error'; error: PaymentError }

export type EngineEventType = EngineEvent['type']

export type EngineEventOf<T extends EngineEventType> = Extract<EngineEvent, { type: T }>
