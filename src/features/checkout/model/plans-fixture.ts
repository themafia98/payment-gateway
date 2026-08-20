import type { Plan } from '@/entities/plan'

export const plans: Plan[] = [
  {
    id: '1id',
    name: 'Monthly',
    price: '25/month',
    currency: '$',
  },
  {
    id: '2id',
    name: 'Yearly',
    discount: '32%',
    price: '125/year',
    currency: '$',
  },
]
