import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PaymentAction, RunnerContext } from '@checkout-kit/core'
import { createRedirectRunner } from './redirect'

const action = (overrides: Partial<Extract<PaymentAction, { kind: 'redirect' }>> = {}) =>
  ({
    id: 'act_1',
    kind: 'redirect',
    purpose: 'authenticate',
    surface: 'iframe',
    url: 'https://bank.test/challenge/act_1',
    method: 'POST',
    fields: { creq: 'eyJ0eXAi' },
    returnUrlField: 'termUrl',
    completion: { via: 'post_message', origin: 'https://bank.test', type: 'verdict' },
    ...overrides,
  }) as Extract<PaymentAction, { kind: 'redirect' }>

const context = (overrides: Partial<RunnerContext> = {}): RunnerContext => {
  const mount = document.createElement('div')
  document.body.append(mount)

  return {
    surface: 'iframe',
    signal: new AbortController().signal,
    returnUrl: 'https://shop.test/payment/return',
    mount: { element: mount, release: () => mount.replaceChildren() },
    deadline: Date.now() + 100,
    report: () => {},
    ...overrides,
  }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('the redirect runner, in a frame', () => {
  it('renders a sandboxed frame and posts the action fields into it', async () => {
    const runner = createRedirectRunner({ frameTitle: () => 'Bank' })
    const ctx = context()
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {})

    void runner.run(action(), ctx)

    const frame = (ctx.mount?.element as HTMLElement).querySelector('iframe')
    expect(frame?.title).toBe('Bank')
    expect(frame?.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-same-origin')
    expect(frame?.referrerPolicy).toBe('no-referrer')

    expect(submit).toHaveBeenCalledOnce()
    submit.mockRestore()
  })

  it('fills the return URL into the field the provider named', async () => {
    const runner = createRedirectRunner()
    const ctx = context()
    let posted: Record<string, string> = {}

    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (
      this: HTMLFormElement,
    ) {
      posted = Object.fromEntries(
        [...this.querySelectorAll('input')].map((input) => [input.name, input.value]),
      )
    })

    void runner.run(action(), ctx)

    expect(posted).toEqual({
      creq: 'eyJ0eXAi',
      // The host built this, not the provider - only it knows its own base path.
      termUrl: 'https://shop.test/payment/return',
    })
    submit.mockRestore()
  })

  it('refuses to render without somewhere to render', async () => {
    const runner = createRedirectRunner()

    const evidence = await runner.run(action(), context({ mount: null }))

    expect(evidence).toMatchObject({ via: 'aborted', reason: 'runner_error' })
  })

  it('refuses an action that cannot report back through the frame', async () => {
    const runner = createRedirectRunner()

    const evidence = await runner.run(
      action({ completion: { via: 'return_url' } }),
      context(),
    )

    expect(evidence).toMatchObject({ via: 'aborted', reason: 'runner_error' })
  })

  it('takes the frame down once it has an answer', async () => {
    const runner = createRedirectRunner()
    const ctx = context()
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {})

    const evidence = runner.run(action(), ctx)

    const event = new MessageEvent('message', {
      data: { type: 'verdict', actionId: 'act_1', transStatus: 'Y' },
    })
    Object.defineProperty(event, 'origin', { value: 'https://bank.test' })
    window.dispatchEvent(event)

    await evidence

    expect((ctx.mount?.element as HTMLElement).querySelector('iframe')).toBeNull()
    submit.mockRestore()
  })
})

describe('the redirect runner, in the whole window', () => {
  it('never resolves, because the page is leaving', async () => {
    const runner = createRedirectRunner()
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {})

    const settled = await Promise.race([
      runner.run(action(), context({ surface: 'top', mount: null })),
      new Promise((resolve) => setTimeout(() => resolve('still running'), 20)),
    ])

    // Resolving would only race the unload; `hydrate()` picks the payment up afterwards.
    expect(settled).toBe('still running')
    expect(submit).toHaveBeenCalledOnce()
    submit.mockRestore()
  })
})
