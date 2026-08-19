import type { MerchantConfig, PaymentIntent, PaymentMethod } from './types'

export const merchantConfig: MerchantConfig = {
  id: 'merchant_demo',
  name: 'Demo Store',
  currency: 'USD',
  amount: 4999,
}

export const paymentMethods: PaymentMethod[] = [
  {
    id: 'card_visa',
    brand: 'Visa',
    label: 'Visa test card',
    last4: '4242',
  },
  {
    id: 'card_mastercard',
    brand: 'Mastercard',
    label: 'Mastercard test card',
    last4: '4444',
  },
]

export const paymentIntents = new Map<string, PaymentIntent>()
