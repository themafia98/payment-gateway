import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PaymentAction, RunnerContext } from '@checkout-kit/core'
import { createDisplayRunner } from './display'

const action = (overrides: Partial<Extract<PaymentAction, { kind: 'display' }>> = {}) =>
  ({
    id: 'act_1',
    kind: 'display',
    purpose: 'authorize',
    surface: 'inline',
    format: 'qr',
    value: '00020126580014BR.GOV.BCB.PIX',
    completion: { via: 'poll', intervalMs: 1000, timeoutMs: 60_000 },
    ...overrides,
  }) as Extract<PaymentAction, { kind: 'display' }>

const context = (overrides: Partial<RunnerContext> = {}): RunnerContext => {
  const mount = document.createElement('div')
  document.body.append(mount)

  return {
    surface: 'inline',
    signal: new AbortController().signal,
    returnUrl: 'https://shop.test/payment/return',
    mount: { element: mount, release: () => mount.replaceChildren() },
    deadline: Date.now() + 60_000,
    report: () => {},
    ...overrides,
  }
}

const hostOf = (ctx: RunnerContext): HTMLElement | undefined =>
  (ctx.mount?.element as HTMLElement | undefined) ?? undefined

afterEach(() => {
  document.body.replaceChildren()
})

describe('the display runner', () => {
  it('shows the QR image and the value behind it', async () => {
    const runner = createDisplayRunner()
    const ctx = context()

    void runner.run(action({ imageUrl: 'https://bank.test/qr/act_1.png' }), ctx)

    const host = hostOf(ctx)
    expect(host?.querySelector('img')?.src).toBe('https://bank.test/qr/act_1.png')
    // Shown next to the code as well: a shopper paying on this phone cannot scan it.
    expect(host?.querySelector('.ck-display__value')?.textContent).toContain('BR.GOV.BCB.PIX')
  })

  it('offers the app link the provider gave', async () => {
    const runner = createDisplayRunner()
    const ctx = context()

    void runner.run(action({ deeplink: 'bankapp://pay/act_1', format: 'code' }), ctx)

    expect(hostOf(ctx)?.querySelector('a')?.href).toBe('bankapp://pay/act_1')
  })

  it('copies the value to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const runner = createDisplayRunner()
    const ctx = context()
    void runner.run(action({ format: 'code', value: '123456' }), ctx)

    hostOf(ctx)?.querySelector('button')?.click()

    expect(writeText).toHaveBeenCalledWith('123456')
  })

  it('waits: nothing on this page can tell when the money arrives', async () => {
    const runner = createDisplayRunner()

    const settled = await Promise.race([
      runner.run(action(), context()),
      new Promise((resolve) => setTimeout(() => resolve('still waiting'), 20)),
    ])

    // The engine polls the provider alongside this and ends the action when it settles.
    expect(settled).toBe('still waiting')
  })

  it('clears the screen when the shopper gives up', async () => {
    const runner = createDisplayRunner()
    const controller = new AbortController()
    const ctx = context({ signal: controller.signal })

    const evidence = runner.run(action(), ctx)
    controller.abort()

    await expect(evidence).resolves.toMatchObject({ via: 'aborted', reason: 'user' })
    expect(hostOf(ctx)?.querySelector('.ck-display')).toBeNull()
  })

  it('gives up when the code expires', async () => {
    const runner = createDisplayRunner()

    const evidence = await runner.run(action(), context({ deadline: Date.now() + 10 }))

    expect(evidence).toMatchObject({ via: 'aborted', reason: 'timeout' })
  })

  it('refuses to render without somewhere to render', async () => {
    const runner = createDisplayRunner()

    const evidence = await runner.run(action(), context({ mount: null }))

    expect(evidence).toMatchObject({ via: 'aborted', reason: 'runner_error' })
  })
})
