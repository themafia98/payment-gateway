import type { CheckoutStatus } from './checkout.types'

export const BUSY: ReadonlySet<CheckoutStatus> = new Set<CheckoutStatus>([
  'processing',
  'authenticating',
])

export const SETTLED: ReadonlySet<CheckoutStatus> = new Set<CheckoutStatus>([
  'succeeded',
  'declined',
  'error',
])
