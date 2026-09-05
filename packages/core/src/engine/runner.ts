// How an action gets executed. The contract is here; the implementations are in
// @pg/runtime-browser, so the engine itself needs no DOM.

import type { ActionSurface, PaymentAction, PaymentActionKind } from '../domain/action'
import type { ActionEvidence } from '../domain/evidence'
import type { ProviderCapabilities } from '../provider/capabilities'

/**
 * Somewhere for a runner to put its DOM. `unknown` on purpose: a generic element type would
 * spread through the engine, its snapshot and its events just to save one cast.
 */
export interface MountHandle {
  readonly element: unknown
  release(): void
}

export interface RunnerContext {
  /**
   * The surface actually chosen. Usually `action.surface`, but a host may move a frame
   * challenge into the whole window, and the runner needs to know which it is running.
   */
  readonly surface: ActionSurface
  readonly signal: AbortSignal
  /** Absolute URL the provider should send the browser back to. Built by the host. */
  readonly returnUrl: string
  /** Where a visible action may render. `null` when the host offered no mount point. */
  readonly mount: MountHandle | null
  /** Wall-clock deadline; runners must give up and report a timeout by then. */
  readonly deadline: number
  report(progress: { stage: string; detail?: string }): void
}

export interface ActionRunner<K extends PaymentActionKind = PaymentActionKind> {
  readonly kind: K
  /** Surfaces this runner can render on. The registry keys on `kind:surface`. */
  readonly surfaces: readonly ActionSurface[]
  run(action: Extract<PaymentAction, { kind: K }>, ctx: RunnerContext): Promise<ActionEvidence>
}

/** A runner with its action kind erased, which is how the registry has to store them. */
export type AnyActionRunner = ActionRunner<PaymentActionKind>

export interface RunnerRegistry {
  register<K extends PaymentActionKind>(runner: ActionRunner<K>): void
  /** Runner for this action, optionally forced onto another surface the host supports. */
  resolve(action: PaymentAction, surface?: ActionSurface): AnyActionRunner | null
  supports(kind: PaymentActionKind, surface: ActionSurface): boolean
  /**
   * Fail at registration: a provider that can return an action this host cannot run is a
   * bug to catch on boot, not halfway through a payment.
   */
  assertCovers(providerId: string, capabilities: ProviderCapabilities): void
}

const key = (kind: PaymentActionKind, surface: ActionSurface): string => `${kind}:${surface}`

export const createRunnerRegistry = (): RunnerRegistry => {
  const runners = new Map<string, AnyActionRunner>()

  const registry: RunnerRegistry = {
    register: (runner) => {
      // Safe by construction: the map is keyed by the runner's own kind, so `resolve`
      // only ever hands back a runner for the action kind it was registered under.
      const erased = runner as unknown as AnyActionRunner
      for (const surface of runner.surfaces) runners.set(key(runner.kind, surface), erased)
    },

    resolve: (action, surface) => runners.get(key(action.kind, surface ?? action.surface)) ?? null,

    supports: (kind, surface) => runners.has(key(kind, surface)),

    assertCovers: (providerId, capabilities) => {
      const missing = capabilities.actions.filter(
        (kind) => !capabilities.surfaces.some((surface) => registry.supports(kind, surface)),
      )
      if (missing.length > 0) {
        throw new Error(
          `Provider "${providerId}" can return ${missing.join(', ')} actions, but this host ` +
            `registered no runner able to execute them. Add the runners (see ` +
            `@pg/runtime-browser) or drop the capability.`,
        )
      }
    },
  }

  return registry
}
