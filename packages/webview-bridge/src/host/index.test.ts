import { describe, expect, it, vi } from 'vitest'
import { BRIDGE_VERSION } from '../protocol'
import { createCheckoutMessageHandler, createNavigationPolicy, parseReturnDeepLink } from './index'

const envelope = (type: string, payload: object = {}, overrides: object = {}) =>
  JSON.stringify({
    source: 'checkout-kit',
    v: BRIDGE_VERSION,
    id: 'msg_1',
    sessionId: 'sess_1',
    ts: Date.now(),
    type,
    payload,
    ...overrides,
  })

describe('createCheckoutMessageHandler', () => {
  it('routes an event to the handler for its type', () => {
    const succeeded = vi.fn()
    const handle = createCheckoutMessageHandler({ PAYMENT_SUCCEEDED: succeeded })

    handle(envelope('PAYMENT_SUCCEEDED', { intentId: 'pi_1', amount: 2500, currency: 'USD' }))

    expect(succeeded).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { intentId: 'pi_1', amount: 2500, currency: 'USD' } }),
    )
  })

  it('ignores the other traffic a WebView carries', () => {
    const onEvent = vi.fn()
    const onUnknown = vi.fn()
    const handle = createCheckoutMessageHandler({ onEvent, onUnknown })

    handle(JSON.stringify({ type: 'PAYMENT_SUCCEEDED' }))
    handle('a plain string from some other script')
    handle(null)

    expect(onEvent).not.toHaveBeenCalled()
    expect(onUnknown).toHaveBeenCalledTimes(3)
    expect(onUnknown).toHaveBeenCalledWith('not_ours', expect.anything())
  })

  it('refuses a version it does not understand instead of guessing', () => {
    const onUnknown = vi.fn()
    const handle = createCheckoutMessageHandler({ onUnknown })

    handle(envelope('PAYMENT_SUCCEEDED', {}, { v: BRIDGE_VERSION + 1 }))

    expect(onUnknown).toHaveBeenCalledWith('unsupported_version', expect.anything())
  })

  it('remembers the session, so a reloaded WebView can be told apart', () => {
    const handle = createCheckoutMessageHandler({})

    handle(envelope('PAYMENT_READY', {}, { sessionId: 'sess_2' }))

    expect(handle.sessionId).toBe('sess_2')
  })
})

describe('createNavigationPolicy', () => {
  const policy = createNavigationPolicy({
    allow: ['https://pay.example.com/checkout'],
    openExternally: ['https://help.example.com'],
    returnScheme: 'myapp',
  })

  it('allows the checkout it was given', () => {
    expect(policy.decide('https://pay.example.com/checkout/card')).toBe('allow')
  })

  it('blocks another path on the same host', () => {
    expect(policy.decide('https://pay.example.com/admin')).toBe('block')
  })

  it('compares the origin exactly', () => {
    // The classic bypass: the allowed URL is in the fragment, not the origin.
    expect(policy.decide('https://evil.test/#https://pay.example.com/checkout')).toBe('block')
    expect(policy.decide('https://pay.example.com.evil.test/checkout')).toBe('block')
  })

  it('never allows plain http', () => {
    expect(policy.decide('http://pay.example.com/checkout')).toBe('block')
  })

  it('sends a return deep link back to the app', () => {
    expect(policy.decide('myapp://payment/return?intentId=pi_1')).toBe('return')
  })

  it('sends mail and phone links outside', () => {
    expect(policy.decide('mailto:support@example.com')).toBe('external')
    expect(policy.decide('https://help.example.com/cards')).toBe('external')
  })

  it('blocks anything it cannot even parse', () => {
    expect(policy.decide('javascript:alert(1)')).toBe('block')
    expect(policy.decide('not a url')).toBe('block')
  })
})

describe('parseReturnDeepLink', () => {
  it('reads the query the provider sent back', () => {
    const params = parseReturnDeepLink('myapp://payment/return?intentId=pi_1&status=ok', {
      scheme: 'myapp',
      path: 'payment/return',
    })

    expect(params).toEqual({ intentId: 'pi_1', status: 'ok' })
  })

  it('ignores a link for something else in the app', () => {
    expect(
      parseReturnDeepLink('myapp://orders/12', { scheme: 'myapp', path: 'payment/return' }),
    ).toBeNull()
    expect(parseReturnDeepLink('https://example.com/return', { scheme: 'myapp' })).toBeNull()
  })
})
