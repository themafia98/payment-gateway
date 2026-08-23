import type { Plan } from '../model/types'
import type { PlanGateway } from './plan-gateway'
import { createHttpClient, type HttpClient } from '@/shared/api'

// Wire format the backend returns. Declared locally so production code never depends
// on test infrastructure (src/mocks). `amount` is minor units (cents); `currency` is
// an ISO 4217 code.
interface PlanDto {
  id: string
  name: string
  discount?: string
  price: string
  amount: number
  currency: string
}

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }

/** DTO -> domain plan. The symbol and major-unit price are derived for display only;
 *  the authoritative amount stays server-side and is applied by createIntent(planId). */
const toDomainPlan = (dto: PlanDto): Plan => ({
  id: dto.id,
  name: dto.name,
  discount: dto.discount,
  price: dto.price,
  priceNumeric: dto.amount / 100,
  currency: CURRENCY_SYMBOL[dto.currency] ?? dto.currency,
  currencyISO: dto.currency,
})

export const createHttpPlanGatewayAdapter = (
  http: HttpClient = createHttpClient(),
): PlanGateway => ({
  async getPlans(): Promise<Plan[]> {
    const dtos = await http.get<PlanDto[]>('/plans')
    return dtos.map(toDomainPlan)
  },
})
