import { describe, expect, it } from 'vitest'
import { awaitPostMessage } from './post-message'

const BANK = 'https://bank.test'

const expectation = (overrides: Partial<Parameters<typeof awaitPostMessage>[0]> = {}) => ({
  actionId: 'act_1',
  origin: BANK,
  type: 'verdict',
  signal: new AbortController().signal,
  deadline: Date.now() + 1000,
  ...overrides,
})

/** happy-dom does not let a test set `event.origin`, so the event is built by hand. */
const post = (data: unknown, origin: string = BANK) => {
  const event = new MessageEvent('message', { data })
  Object.defineProperty(event, 'origin', { value: origin })
  window.dispatchEvent(event)
}

describe('awaitPostMessage', () => {
  it('accepts a message that matches origin, type and action id', async () => {
    const evidence = awaitPostMessage(expectation())
    post({ type: 'verdict', actionId: 'act_1', transStatus: 'Y' })

    await expect(evidence).resolves.toMatchObject({
      via: 'post_message',
      actionId: 'act_1',
      origin: BANK,
      // Passed through untouched: reading it is the plugin's job, not ours.
      data: { transStatus: 'Y' },
    })
  })

  it('ignores a message from another origin', async () => {
    const evidence = awaitPostMessage(expectation({ deadline: Date.now() + 40 }))

    // Same shape, wrong sender. This is the check that stops any page on the internet
    // from settling a payment.
    post({ type: 'verdict', actionId: 'act_1', transStatus: 'Y' }, 'https://evil.test')

    await expect(evidence).resolves.toMatchObject({ via: 'aborted', reason: 'timeout' })
  })

  it('ignores a message of another type', async () => {
    const evidence = awaitPostMessage(expectation({ deadline: Date.now() + 40 }))
    post({ type: 'something-else', actionId: 'act_1' })

    await expect(evidence).resolves.toMatchObject({ via: 'aborted', reason: 'timeout' })
  })

  it('ignores a message about a different action', async () => {
    const evidence = awaitPostMessage(expectation({ deadline: Date.now() + 40 }))

    // A stale message from an earlier attempt must not settle this one.
    post({ type: 'verdict', actionId: 'act_0', transStatus: 'Y' })

    await expect(evidence).resolves.toMatchObject({ via: 'aborted', reason: 'timeout' })
  })

  it('checks the action id under the name the provider uses for it', async () => {
    const evidence = awaitPostMessage(expectation({ correlationField: 'MD' }))
    post({ type: 'verdict', MD: 'act_1', transStatus: 'Y' })

    await expect(evidence).resolves.toMatchObject({ via: 'post_message', actionId: 'act_1' })
  })

  it('rejects a mismatch under that name too', async () => {
    const evidence = awaitPostMessage(
      expectation({ correlationField: 'MD', deadline: Date.now() + 40 }),
    )
    post({ type: 'verdict', MD: 'somebody-elses-payment', transStatus: 'Y' })

    await expect(evidence).resolves.toMatchObject({ via: 'aborted', reason: 'timeout' })
  })

  it('ignores anything that is not an object', async () => {
    const evidence = awaitPostMessage(expectation({ deadline: Date.now() + 40 }))
    post('verdict')
    post(null)

    await expect(evidence).resolves.toMatchObject({ via: 'aborted', reason: 'timeout' })
  })

  it('reports an abort as the shopper giving up', async () => {
    const controller = new AbortController()
    const evidence = awaitPostMessage(expectation({ signal: controller.signal }))

    controller.abort()

    await expect(evidence).resolves.toMatchObject({ via: 'aborted', reason: 'user' })
  })

  it('stops listening once it has answered', async () => {
    const evidence = awaitPostMessage(expectation())
    post({ type: 'verdict', actionId: 'act_1', transStatus: 'Y' })
    await evidence

    // A second message must not throw, and must not resolve anything twice.
    expect(() => post({ type: 'verdict', actionId: 'act_1', transStatus: 'N' })).not.toThrow()
  })
})
