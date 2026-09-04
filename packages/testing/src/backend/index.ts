// An in-memory payment backend. The same handlers serve the browser worker in the demo
// app and `setupServer` in Node tests, so a plugin is verified against exactly the
// backend a developer sees in DevTools.

export { handlers } from './handlers'
export { merchantHandlers } from './handlers/merchant'
export { paymentIntentHandlers } from './handlers/payment-intents'
export { paymentMethodHandlers } from './handlers/payment-methods'
export { planHandlers } from './handlers/plans'
export { receiptHandlers } from './handlers/receipts'
export { threeDsHandlers, createChallenge } from './handlers/three-ds'
export { LATENCY, OTP_SUCCESS } from './config'
export * from './data'
export type * from './types'
