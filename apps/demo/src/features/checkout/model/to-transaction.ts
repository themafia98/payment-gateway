import type { PaymentIntent } from '@/entities/payment'
import type { PaymentMethod } from '@/entities/payment-method'
import type { Transaction } from '@/entities/transaction'

const symbol: Record<string, string> = { USD: '$', EUR: '€' }

export const toTransaction = (
  intent: PaymentIntent,
  method: PaymentMethod | null,
  merchantName: string,
): Transaction => ({
  id: intent.id,
  amount: `${symbol[intent.currency] ?? ''}${(intent.amount / 100).toFixed(2)}`,
  paymentMethod: method ?? '—',
  date: new Date().toLocaleDateString(),
  merchant: merchantName,
})
