import type { Plan } from '../model/types'

// PlanGateway port: the catalog is owned by the backend. UI/features depend on this
// interface, not on a hardcoded fixture. Swap the adapter (HTTP or a fake) freely.
export interface PlanGateway {
  getPlans(): Promise<Plan[]>
}
