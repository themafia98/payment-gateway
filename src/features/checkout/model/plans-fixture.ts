import type { Plan } from '@/entities/plan'

export const plans: Plan[] = [
  {
    id: '1id',
    name: 'Monthly',
    price: '25/month',
    priceNumeric: 25,
    currency: '$',
    currencyISO: 'USD',
  },
  {
    id: '2id',
    name: 'Yearly',
    discount: '32%',
    price: '125/year',
    priceNumeric: 125,
    currency: '$',
    currencyISO: 'USD',
  },
]
