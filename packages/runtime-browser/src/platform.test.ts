import { afterEach, describe, expect, it } from 'vitest'
import { applyPlatform, detectPlatform } from './platform'

const pretend = (ua: string, extras: Record<string, unknown> = {}) => {
  for (const [key, value] of Object.entries({ userAgent: ua, maxTouchPoints: 0, ...extras })) {
    Object.defineProperty(navigator, key, { value, configurable: true })
  }
}

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'
const IPAD =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124 Mobile'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124'

afterEach(() => {
  for (const key of ['userAgent', 'maxTouchPoints', 'userAgentData']) {
    Reflect.deleteProperty(navigator, key)
  }
})

describe('detectPlatform', () => {
  it('prefers the client hint over the user agent string', () => {
    // Chromium reports this directly; it is the only part of the UA that is not a guess.
    pretend(MAC, { userAgentData: { platform: 'Android', mobile: true } })

    expect(detectPlatform()).toBe('android')
  })

  it('recognises an iPhone and an Android', () => {
    pretend(IPHONE)
    expect(detectPlatform()).toBe('ios')

    pretend(ANDROID)
    expect(detectPlatform()).toBe('android')
  })

  it('sees through an iPad claiming to be a Mac', () => {
    // iPadOS has said "Macintosh" since 13. A Mac has no touch points; an iPad has five.
    pretend(IPAD, { maxTouchPoints: 5 })
    expect(detectPlatform()).toBe('ios')

    pretend(MAC, { maxTouchPoints: 0 })
    expect(detectPlatform()).toBe('desktop')
  })

  it('falls back to desktop rather than guessing', () => {
    pretend('something nobody has seen before')

    expect(detectPlatform()).toBe('desktop')
  })
})

describe('applyPlatform', () => {
  it('stamps the root, which is where the stylesheet reads it', () => {
    pretend(IPHONE)
    const root = document.createElement('div')

    expect(applyPlatform(root)).toBe('ios')
    expect(root.dataset.ckPlatform).toBe('ios')
  })

  it('takes a platform when it is told one', () => {
    pretend(IPHONE)
    const root = document.createElement('div')

    applyPlatform(root, 'desktop')

    expect(root.dataset.ckPlatform).toBe('desktop')
  })
})
