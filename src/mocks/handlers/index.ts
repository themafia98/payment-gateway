import { merchantHandlers } from './merchant'
import { paymentMethodHandlers } from './payment-methods'
import { paymentIntentHandlers } from './payment-intents'
import { threeDsHandlers } from './three-ds'
import { receiptHandlers } from './receipts'

export const handlers = [
  ...merchantHandlers,
  ...paymentMethodHandlers,
  ...paymentIntentHandlers,
  ...threeDsHandlers,
  ...receiptHandlers,
]
