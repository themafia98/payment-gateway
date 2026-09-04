import { acquiringHandlers } from './acquiring'
import { hostedFieldsHandlers } from './hosted-fields'
import { hostedPageHandlers } from './hosted-page'
import { merchantHandlers } from './merchant'
import type { HttpHandler } from 'msw'
import { paymentMethodHandlers } from './payment-methods'
import { paymentIntentHandlers } from './payment-intents'
import { planHandlers } from './plans'
import { threeDsHandlers } from './three-ds'
import { receiptHandlers } from './receipts'

export const handlers: HttpHandler[] = [
  ...acquiringHandlers,
  ...hostedFieldsHandlers,
  ...hostedPageHandlers,
  ...merchantHandlers,
  ...paymentMethodHandlers,
  ...paymentIntentHandlers,
  ...planHandlers,
  ...threeDsHandlers,
  ...receiptHandlers,
]
