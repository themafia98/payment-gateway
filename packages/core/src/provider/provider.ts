// The plugin contract. Everything a payment integration must implement, and nothing about
// how it talks to its backend - JSON, form-urlencoded, two round trips, an error code
// hidden inside HTTP 200: all of that is the plugin's private business.

import type { ActionEvidence } from '../domain/evidence'
import type { CreateIntentInput, PaymentIntent } from '../domain/intent'
import type { PaymentInstrument } from '../domain/instrument'
import type { PaymentResult } from '../domain/result'
import type { Logger } from '../support/logger'
import type { ProviderCapabilities } from './capabilities'

export interface ProviderContext<TConfig> {
  readonly config: TConfig
  /**
   * The plugin builds its own HTTP client from this (see `@pg/core/http`). Handing over
   * `fetch` rather than a ready-made client is what lets one plugin speak JSON and the
   * next form-urlencoded with a business error code inside HTTP 200.
   */
  readonly fetch: typeof fetch
  /** Injected, so tests get deterministic ids and the core stays free of `crypto`. */
  readonly uuid: () => string
  readonly now: () => number
  readonly log: Logger
}

export interface CallOptions {
  readonly idempotencyKey: string
  readonly signal?: AbortSignal
}

/**
 * The live half of a plugin, created once per configured provider.
 *
 * Contract, verified by the conformance suite: **`confirm` and `resume` never throw**. A
 * network failure, a malformed reply, an unknown status - all of it comes back as
 * `{ status: 'error' }`, because those two carry the payment's outcome and a thrown error
 * would leave the caller unable to say what happened to the money.
 *
 * `createIntent`, `getIntent` and `cancel` may reject: they have no result type to put a
 * failure in, and there is no payment yet (or none in flight) to misreport. The engine
 * converts those rejections into an error result on their behalf.
 */
export interface PaymentProviderInstance {
  createIntent(input: CreateIntentInput, opts: CallOptions): Promise<PaymentIntent>

  /** Present the instrument. May settle immediately or ask for an action. */
  confirm(
    intentId: string,
    instrument: PaymentInstrument,
    opts: CallOptions,
  ): Promise<PaymentResult>

  /**
   * Continue after an action finished. Replaces the old, 3-D Secure shaped
   * `authenticate(challengeId, outcome)`: the plugin - not the UI - decides what the
   * evidence means, which is why the same method serves a 3-D Secure verdict, a hosted
   * payment page return and a wallet token alike.
   */
  resume(intentId: string, evidence: ActionEvidence, opts: CallOptions): Promise<PaymentResult>

  /** Authoritative re-read. The engine calls it whenever evidence alone is not enough. */
  getIntent(intentId: string, opts: CallOptions): Promise<PaymentIntent>

  cancel?(intentId: string, opts: CallOptions): Promise<PaymentIntent>
}

export interface PaymentProvider<TConfig = unknown> {
  readonly id: string
  readonly displayName: string
  readonly capabilities: ProviderCapabilities
  create(ctx: ProviderContext<TConfig>): PaymentProviderInstance
}
