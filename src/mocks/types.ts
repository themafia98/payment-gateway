export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'declined'
  | 'canceled'

export type PaymentMethod = {
  id: string
  brand: string
  label: string
  last4: string
}

export type MerchantConfig = {
  id: string
  name: string
  currency: string
  amount: number
}

export type PaymentIntent = {
  id: string
  amount: number
  currency: string
  status: PaymentIntentStatus
  clientSecret: string
  createdAt: string
  error?: string
}

export type CreatePaymentIntentRequest = {
  amount: number
  currency: string
}

export type ConfirmPaymentIntentRequest = {
  cardNumber: string
}
