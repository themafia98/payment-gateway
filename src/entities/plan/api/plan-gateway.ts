import type { Plan } from '../model/types'

export interface PlanGateway {
  getPlans(): Promise<Plan[]>
}
