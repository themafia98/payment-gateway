// What a payment plugin implements. Nothing here describes how it talks to its backend -
// that is the plugin's own business.

import type { ActionEvidence } from '../domain/evidence'
import type { CreateIntentInput, PaymentIntent } from '../domain/intent'
import type { PaymentInstrument } from '../domain/instrument'
import type { PaymentResult } from '../domain/result'
import type { Logger } from '../support/logger'
import type { ProviderCapabilities } from './capabilities'

export interface ProviderContext<TConfig> {
  readonly config: TConfig
  /**
   * The plugin builds its own HTTP client from this (see `@pg/core/http`). Passing `fetch`
   * rather than a ready-made client is what lets plugins speak different wire formats.
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
 * Rule, checked by the conformance suite: **`confirm` and `resume` never throw**. Network
 * failures, bad replies and unknown statuses all come back as `{ status: 'error' }`,
 * because these two report what happened to the money and an exception cannot.
 *
 * `createIntent`, `getIntent` and `cancel` may reject - the engine turns that into an
 * error result.
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
   * Continue once an action has finished. The plugin, not the UI, decides what the evidence
   * means - which is why one method serves a 3-D Secure verdict, a return URL and a wallet
   * token alike.
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
