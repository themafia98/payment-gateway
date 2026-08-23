import type {
  MerchantConfig,
  PaymentIntent,
  PaymentMethod,
  PlanRecord,
  ThreeDSChallenge,
} from './types'

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

export const plans: PlanRecord[] = [
  { id: '1id', name: 'Monthly', price: '25/month', amount: 2500, currency: 'USD' },
  { id: '2id', name: 'Yearly', discount: '32%', price: '125/year', amount: 12500, currency: 'USD' },
]

export const plansById = new Map(plans.map((plan) => [plan.id, plan]))

export const paymentIntents = new Map<string, PaymentIntent>()

export const idempotencyKeys = new Map<string, string>()

export const threeDSChallenges = new Map<string, ThreeDSChallenge>()
