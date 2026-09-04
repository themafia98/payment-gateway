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

export const plansById: Map<string, PlanRecord> = new Map(plans.map((plan) => [plan.id, plan]))

export const paymentIntents: Map<string, PaymentIntent> = new Map()

export const idempotencyKeys: Map<string, string> = new Map()

export const threeDSChallenges: Map<string, ThreeDSChallenge> = new Map()
