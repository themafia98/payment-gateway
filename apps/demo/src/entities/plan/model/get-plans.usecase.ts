import type { PlanGateway } from '../api/plan-gateway'
import type { Plan } from './types'

// The plan catalog the checkout renders from.
export const createGetPlans = (gateway: PlanGateway) => (): Promise<Plan[]> => gateway.getPlans()
