import type { Invoice } from '@/entities/invoice'
import type { Plan } from '@/entities/plan'

export const toInvoice = (dto: Plan): Invoice => ({
  subtotal: dto.priceNumeric,
  discount: dto.discount,
  total: dto.priceNumeric,
  currency: dto.currency,
})
