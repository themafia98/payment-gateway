import type { PaymentIntent } from '@/entities/payment'
import type { PaymentMethod } from '@/entities/payment-method'
import type { Transaction } from '@/entities/transaction'

const MERCHANT = 'Store'
const symbol: Record<string, string> = { USD: '$', EUR: '€' }

export const toTransaction = (
  intent: PaymentIntent,
  method: PaymentMethod | null,
): Transaction => ({
  id: intent.id,
  amount: `${symbol[intent.currency] ?? ''}${intent.amount.toFixed(2)}`,
  paymentMethod: method ?? '—',
  date: new Date().toLocaleDateString(),
  merchant: MERCHANT,
})
