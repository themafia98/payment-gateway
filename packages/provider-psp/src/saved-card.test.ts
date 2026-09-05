import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import {
  paymentIntentHandlers,
  paymentMethods,
  resetBackend,
  threeDsHandlers,
} from '@checkout-kit/testing/backend'
import type { PaymentInstrument, PaymentProviderInstance } from '@checkout-kit/core'
import { pspProvider, type PspConfig } from './provider'

// A card the shopper saved on a previous visit. The browser holds an id and four digits;
// the number lives on the server, which is the entire point of saving one.

const config: PspConfig = {
  baseUrl: 'http://payments.test/api',
  acsOrigin: 'https://acs.test',
}

const server = setupServer(...paymentIntentHandlers, ...threeDsHandlers)

const savedCard = (token: string): PaymentInstrument => ({ kind: 'token', token })

let provider: PaymentProviderInstance
let keySeed = 0
const nextKey = () => ({ idempotencyKey: `key_${++keySeed}` })

const startPayment = () => provider.createIntent({ planId: '1id' }, nextKey())

describe('paying with a saved card', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  beforeEach(() => {
    resetBackend()
    provider = pspProvider.create({
      config,
      fetch: (...args) => globalThis.fetch(...args),
      uuid: () => `uuid_${++keySeed}`,
      now: () => Date.now(),
      log: { debug: () => {}, warn: () => {}, error: () => {} },
    })
  })

  it('charges the card behind the id', async () => {
    const intent = await startPayment()

    const result = await provider.confirm(intent.id, savedCard('pm_visa_4242'), nextKey())

    expect(result.status).toBe('succeeded')
  })

  it('still lets the bank ask for authentication', async () => {
    const intent = await startPayment()

    // Saving a card does not save the shopper from 3-D Secure. A plugin that assumes
    // otherwise breaks on exactly the payments that matter most.
    const result = await provider.confirm(intent.id, savedCard('pm_visa_3155'), nextKey())

    expect(result.status).toBe('requires_action')
    expect(result.status === 'requires_action' && result.action.kind).toBe('redirect')
  })

  it('never sends the number, only the id', async () => {
    const sent: string[] = []
    server.events.on('request:start', ({ request }) => {
      void request
        .clone()
        .text()
        .then((body) => sent.push(body))
    })

    const intent = await startPayment()
    await provider.confirm(intent.id, savedCard('pm_visa_4242'), nextKey())
    server.events.removeAllListeners()

    expect(sent.some((body) => body.includes('pm_visa_4242'))).toBe(true)
    for (const body of sent) {
      expect(body).not.toContain('4242424242424242')
    }
  })

  it('fails cleanly on an id the backend does not know', async () => {
    const intent = await startPayment()

    const result = await provider.confirm(intent.id, savedCard('pm_not_yours'), nextKey())

    expect(result.status).toBe('error')
    // Not a decline: nothing was ever presented to an issuer.
    expect(result.status === 'error' && result.error.message).toBeTruthy()
  })

  it('offers the shopper only what is safe to show', () => {
    // What the checkout renders the picker from. Four digits and a brand, nothing else.
    for (const method of paymentMethods) {
      expect(Object.keys(method).sort()).toEqual(['brand', 'id', 'label', 'last4'])
      expect(method.last4).toHaveLength(4)
    }
  })
})
