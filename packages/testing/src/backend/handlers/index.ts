import { merchantHandlers } from './merchant'
import type { HttpHandler } from 'msw'
import { paymentMethodHandlers } from './payment-methods'
import { paymentIntentHandlers } from './payment-intents'
import { planHandlers } from './plans'
import { threeDsHandlers } from './three-ds'
import { receiptHandlers } from './receipts'

export const handlers: HttpHandler[] = [
  ...merchantHandlers,
  ...paymentMethodHandlers,
  ...paymentIntentHandlers,
  ...planHandlers,
  ...threeDsHandlers,
  ...receiptHandlers,
]
