import { describe, expect, it } from 'vitest'
import { isBusyPhase, isSettledPhase, nextPhase, type CheckoutPhase } from './machine'

const ALL_PHASES: readonly CheckoutPhase[] = [
  'idle',
  'preparing',
  'ready',
  'creating',
  'confirming',
  'action_pending',
  'action_running',
  'resuming',
  'polling',
  'succeeded',
  'declined',
  'canceled',
  'failed',
]

describe('checkout machine', () => {
  it('walks a plain card payment from idle to succeeded', () => {
    let phase: CheckoutPhase = 'idle'
    for (const event of ['pay', 'created', 'succeeded'] as const) {
      const next = nextPhase(phase, event)
      expect(next, `${phase} -> ${event}`).not.toBeNull()
      phase = next as CheckoutPhase
    }
    expect(phase).toBe('succeeded')
  })

  it('walks an authenticated payment through its action', () => {
    let phase: CheckoutPhase = 'idle'
    const script = [
      'pay',
      'created',
      'action_required',
      'run_action',
      'action_done',
      'succeeded',
    ] as const

    for (const event of script) {
      const next = nextPhase(phase, event)
      expect(next, `${phase} -> ${event}`).not.toBeNull()
      phase = next as CheckoutPhase
    }
    expect(phase).toBe('succeeded')
  })

  it('treats a second run_action as a change of surface, not a new payment', () => {
    // The shopper moved the challenge from the frame into the whole window.
    expect(nextPhase('action_running', 'run_action')).toBe('action_running')
  })

  it('picks a redirected payment back up from idle', () => {
    expect(nextPhase('idle', 'hydrate')).toBe('resuming')
  })

  it('refuses events that would skip a step', () => {
    expect(nextPhase('idle', 'action_done')).toBeNull()
    expect(nextPhase('idle', 'created')).toBeNull()
    expect(nextPhase('confirming', 'run_action')).toBeNull()
    expect(nextPhase('action_pending', 'action_done')).toBeNull()
  })

  it('will not restart a settled payment except by resetting or paying again', () => {
    expect(nextPhase('succeeded', 'pay')).toBeNull()
    expect(nextPhase('succeeded', 'action_required')).toBeNull()
    expect(nextPhase('succeeded', 'reset')).toBe('idle')

    // A decline or a failure is the shopper's cue to try another card.
    expect(nextPhase('declined', 'pay')).toBe('creating')
    expect(nextPhase('failed', 'pay')).toBe('creating')
    expect(nextPhase('canceled', 'pay')).toBe('creating')
  })

  it('lets every phase be reset', () => {
    for (const phase of ALL_PHASES) {
      expect(nextPhase(phase, 'reset'), phase).toBe('idle')
    }
  })

  it('agrees with itself about what is busy and what is settled', () => {
    for (const phase of ALL_PHASES) {
      expect(isBusyPhase(phase) && isSettledPhase(phase), phase).toBe(false)
    }

    expect(ALL_PHASES.filter(isSettledPhase)).toEqual([
      'succeeded',
      'declined',
      'canceled',
      'failed',
    ])
    expect(ALL_PHASES.filter(isBusyPhase)).toEqual([
      'preparing',
      'creating',
      'confirming',
      'action_running',
      'resuming',
      'polling',
    ])
  })
})
