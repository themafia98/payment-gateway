import type { PaymentIntent } from '@/entities/payment'
import type { Transaction } from '@/entities/transaction'

const symbol: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }

export const toTransaction = (
  intent: PaymentIntent,
  paymentMethod: string,
  merchantName: string,
): Transaction => ({
  id: intent.id,
  amount: `${symbol[intent.currency] ?? ''}${(intent.amount / 100).toFixed(2)}`,
  paymentMethod,
  merchant: merchantName,
})
