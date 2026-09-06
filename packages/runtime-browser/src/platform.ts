// CSS handles touch, hover and colour scheme. This is only for what it cannot see: iPhone
// vs Android, which decides the font, the radius and what a press looks like.

export type Platform = 'ios' | 'android' | 'desktop'

interface UserAgentData {
  readonly platform?: string
  readonly mobile?: boolean
}

const fromClientHints = (): Platform | null => {
  const data = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData
  if (!data?.platform) return null

  const platform = data.platform.toLowerCase()
  if (platform === 'android') return 'android'
  if (platform === 'ios') return 'ios'
  return data.mobile ? null : 'desktop'
}

export const detectPlatform = (): Platform => {
  if (typeof navigator === 'undefined') return 'desktop'

  const hinted = fromClientHints()
  if (hinted) return hinted

  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipod/i.test(ua)) return 'ios'
  // iPadOS says "Macintosh"; the touch points give it away.
  if (/ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'

  return 'desktop'
}

/** Stamps the platform on the checkout root. `<CheckoutRoot>` does this for you. */
export const applyPlatform = (element: HTMLElement, platform?: Platform): Platform => {
  const resolved = platform ?? detectPlatform()
  element.dataset.ckPlatform = resolved
  return resolved
}
