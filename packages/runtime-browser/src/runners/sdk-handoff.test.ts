import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PaymentAction, RunnerContext } from '@checkout-kit/core'
import { createSdkHandoffRunner } from './sdk-handoff'

const action = (overrides: Partial<Extract<PaymentAction, { kind: 'sdk_handoff' }>> = {}) =>
  ({
    id: 'act_1',
    kind: 'sdk_handoff',
    purpose: 'authorize',
    surface: 'none',
    sdk: 'wallet',
    completion: { via: 'sdk_callback' },
    params: { amount: 2500 },
    ...overrides,
  }) as Extract<PaymentAction, { kind: 'sdk_handoff' }>

/**
 * Catches script tags on their way into the document and reports them as loaded, so no
 * test depends on a network fetch - or on what happy-dom does when one fails.
 */
const captureScripts = () => {
  const appended: HTMLScriptElement[] = []
  vi.spyOn(document.head, 'append').mockImplementation((...nodes: unknown[]) => {
    for (const node of nodes) {
      if (node instanceof HTMLScriptElement) {
        appended.push(node)
        node.dispatchEvent(new Event('load'))
      }
    }
  })
  return appended
}

const context = (): RunnerContext => ({
  surface: 'none',
  signal: new AbortController().signal,
  returnUrl: 'https://shop.test/payment/return',
  mount: null,
  deadline: Date.now() + 1000,
  report: () => {},
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the SDK handoff runner', () => {
  it('passes the action parameters to the adapter and returns what it produces', async () => {
    const request = vi.fn().mockResolvedValue({ walletToken: 'wlt_1' })
    const runner = createSdkHandoffRunner({ adapters: [{ sdk: 'wallet', request }] })

    const evidence = await runner.run(action(), context())

    expect(request).toHaveBeenCalledWith({ amount: 2500 }, expect.anything())
    expect(evidence).toMatchObject({
      via: 'sdk_callback',
      actionId: 'act_1',
      payload: { walletToken: 'wlt_1' },
    })
  })

  it('fails clearly when no adapter is registered for that SDK', async () => {
    const runner = createSdkHandoffRunner({ adapters: [] })

    const evidence = await runner.run(action(), context())

    // A boot-time mistake, and the message says how to fix it.
    expect(evidence).toMatchObject({ via: 'aborted', reason: 'runner_error' })
    expect(String((evidence as { cause?: Error }).cause)).toContain('wallet')
  })

  it('treats a closed sheet as the shopper giving up, not as a failure', async () => {
    const runner = createSdkHandoffRunner({
      adapters: [
        {
          sdk: 'wallet',
          request: () => Promise.reject(new Error('the shopper closed the wallet')),
        },
      ],
    })

    const evidence = await runner.run(action(), context())

    expect(evidence).toMatchObject({ via: 'aborted', reason: 'user' })
  })

  it('loads a script once, however many payments ask for it', async () => {
    const runner = createSdkHandoffRunner({
      adapters: [{ sdk: 'wallet', request: () => Promise.resolve({ ok: true }) }],
    })
    const scriptUrl = 'https://wallet.test/sdk.js'

    // The script is caught on its way into the document and reported as loaded, so the
    // test never depends on anything being fetched. Two payments, one script: loading a
    // wallet SDK twice leaves two conflicting globals.
    const appended = captureScripts()

    await runner.run(action({ scriptUrl }), context())
    await runner.run(action({ id: 'act_2', scriptUrl }), context())

    expect(appended).toHaveLength(1)
    expect(appended[0]?.src).toBe(scriptUrl)
  })

  it('passes an integrity hash through to the script tag', async () => {
    const runner = createSdkHandoffRunner({
      adapters: [{ sdk: 'wallet', request: () => Promise.resolve({}) }],
    })

    const appended = captureScripts()

    await runner.run(
      action({ scriptUrl: 'https://wallet.test/pinned.js', integrity: 'sha384-abc' }),
      context(),
    )

    // Running a third party's code is the whole arrangement; pinning it is worth doing.
    expect(appended[0]?.integrity).toBe('sha384-abc')
    expect(appended[0]?.crossOrigin).toBe('anonymous')
  })
})
