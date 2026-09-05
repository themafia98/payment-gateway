// A plugin with no network behind it, scripted per test. Useful for testing the engine;
// real plugins are exercised against the mock backend through the conformance suite.

import type {
  CallOptions,
  CreateIntentInput,
  PaymentAction,
  PaymentIntent,
  PaymentProvider,
  PaymentProviderInstance,
  PaymentResult,
  ProviderCapabilities,
} from '@checkout-kit/core'

export interface FakeProviderScript {
  /** Answers for successive `confirm` calls; the last one repeats. */
  readonly confirm?: readonly PaymentResult[]
  /** Answers for successive `resume` calls; the last one repeats. */
  readonly resume?: readonly PaymentResult[]
  readonly createIntent?: () => PaymentIntent | Promise<PaymentIntent>
  readonly getIntent?: (intentId: string) => PaymentIntent | Promise<PaymentIntent>
  readonly capabilities?: Partial<ProviderCapabilities>
}

export interface FakeProviderCalls {
  readonly createIntent: { input: CreateIntentInput; opts: CallOptions }[]
  readonly confirm: { intentId: string; opts: CallOptions }[]
  readonly resume: { intentId: string; opts: CallOptions }[]
  readonly cancel: { intentId: string }[]
  readonly getIntent: { intentId: string }[]
}

export const FAKE_PROVIDER_ID = 'fake'

const baseCapabilities: ProviderCapabilities = {
  instruments: ['card', 'none'],
  actions: ['redirect', 'poll', 'collect_fields', 'sdk_handoff'],
  surfaces: ['iframe', 'top', 'inline', 'none'],
  authentication: ['none', '3ds2'],
  session: 'lazy',
  cancel: true,
  poll: true,
  idempotency: 'header',
}

export const fakeIntent = (overrides: Partial<PaymentIntent> = {}): PaymentIntent => ({
  id: 'pi_fake',
  amount: 2500,
  currency: 'USD',
  status: 'requires_payment_method',
  providerId: FAKE_PROVIDER_ID,
  ...overrides,
})

export const fakeAction = (overrides: Partial<PaymentAction> = {}): PaymentAction =>
  ({
    id: 'act_1',
    kind: 'redirect',
    purpose: 'authenticate',
    surface: 'iframe',
    url: 'https://bank.test/challenge/act_1',
    method: 'POST',
    completion: { via: 'post_message', origin: 'https://bank.test', type: 'verdict' },
    ...overrides,
  }) as PaymentAction

export interface FakeProvider {
  readonly provider: PaymentProvider<Record<string, never>>
  readonly calls: FakeProviderCalls
}

/** Takes the next answer, keeping the last one once the script runs out. */
const nextOf = <T>(script: readonly T[] | undefined, index: number, fallback: T): T => {
  if (!script || script.length === 0) return fallback
  return script[Math.min(index, script.length - 1)] ?? fallback
}

export const createFakeProvider = (script: FakeProviderScript = {}): FakeProvider => {
  const calls: FakeProviderCalls = {
    createIntent: [],
    confirm: [],
    resume: [],
    cancel: [],
    getIntent: [],
  }

  const instance: PaymentProviderInstance = {
    createIntent: async (input, opts) => {
      calls.createIntent.push({ input, opts })
      return await (script.createIntent?.() ?? fakeIntent())
    },

    confirm: async (intentId, _instrument, opts) => {
      calls.confirm.push({ intentId, opts })
      return nextOf(script.confirm, calls.confirm.length - 1, {
        status: 'succeeded',
        intent: fakeIntent({ status: 'succeeded' }),
      })
    },

    resume: async (intentId, _evidence, opts) => {
      calls.resume.push({ intentId, opts })
      return nextOf(script.resume, calls.resume.length - 1, {
        status: 'succeeded',
        intent: fakeIntent({ status: 'succeeded' }),
      })
    },

    getIntent: async (intentId) => {
      calls.getIntent.push({ intentId })
      return await (script.getIntent?.(intentId) ?? fakeIntent({ status: 'succeeded' }))
    },

    cancel: async (intentId) => {
      calls.cancel.push({ intentId })
      return fakeIntent({ status: 'canceled' })
    },
  }

  return {
    calls,
    provider: {
      id: FAKE_PROVIDER_ID,
      displayName: 'Fake provider',
      capabilities: { ...baseCapabilities, ...script.capabilities },
      create: () => instance,
    },
  }
}
