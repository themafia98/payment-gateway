// Runners that answer from a script instead of a browser. Everything that needs a DOM sits
// behind the runner contract, so replacing the runners replaces the whole browser.

import {
  createRunnerRegistry,
  type ActionEvidence,
  type ActionSurface,
  type PaymentAction,
  type PaymentActionKind,
  type RunnerRegistry,
} from '@checkout-kit/core'

const ALL_KINDS: readonly PaymentActionKind[] = [
  'redirect',
  'collect_fields',
  'sdk_handoff',
  'poll',
]

const ALL_SURFACES: readonly ActionSurface[] = ['top', 'iframe', 'popup', 'inline', 'none']

export interface ScriptedRunnersOptions {
  /** What each action produces. Defaults to a successful 3-D Secure style verdict. */
  readonly evidence?: (action: PaymentAction) => ActionEvidence | Promise<ActionEvidence>
  /** Called with every action the engine runs, in order - handy for assertions. */
  readonly onRun?: (action: PaymentAction, surface: ActionSurface) => void
  readonly kinds?: readonly PaymentActionKind[]
  readonly surfaces?: readonly ActionSurface[]
}

const defaultEvidence = (action: PaymentAction): ActionEvidence => ({
  via: 'post_message',
  actionId: action.id,
  origin: action.completion.via === 'post_message' ? action.completion.origin : 'https://bank.test',
  data: { transStatus: 'Y' },
})

export const createScriptedRunners = (options: ScriptedRunnersOptions = {}): RunnerRegistry => {
  const registry = createRunnerRegistry()

  for (const kind of options.kinds ?? ALL_KINDS) {
    registry.register({
      kind,
      surfaces: options.surfaces ?? ALL_SURFACES,
      run: async (action, ctx) => {
        options.onRun?.(action, ctx.surface)
        return await (options.evidence ?? defaultEvidence)(action)
      },
    })
  }

  return registry
}

/** Evidence shaped like a shopper who gave up. */
export const abortedEvidence = (action: PaymentAction): ActionEvidence => ({
  via: 'aborted',
  actionId: action.id,
  reason: 'user',
})
