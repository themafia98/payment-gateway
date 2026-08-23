import { merchantHandlers } from './merchant'
import { paymentMethodHandlers } from './payment-methods'
import { paymentIntentHandlers } from './payment-intents'
import { planHandlers } from './plans'
import { threeDsHandlers } from './three-ds'
import { receiptHandlers } from './receipts'

export const handlers = [
  ...merchantHandlers,
  ...paymentMethodHandlers,
  ...paymentIntentHandlers,
  ...planHandlers,
  ...threeDsHandlers,
  ...receiptHandlers,
]
