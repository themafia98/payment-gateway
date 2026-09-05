import type { Plan } from '../model/types'
import type { PlanGateway } from './plan-gateway'
import { createApiClient, type HttpClient } from '@/shared/api'

interface PlanDto {
  id: string
  name: string
  discount?: string
  price: string
  amount: number
  currency: string
}

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }

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
  http: HttpClient = createApiClient(),
): PlanGateway => ({
  async getPlans(): Promise<Plan[]> {
    const dtos = await http.get<PlanDto[]>('/plans')
    return dtos.map(toDomainPlan)
  },
})
