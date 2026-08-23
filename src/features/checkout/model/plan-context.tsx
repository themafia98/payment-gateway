import type { Plan } from '@/entities/plan'
import { createContext, use, useCallback, type ReactNode } from 'react'

type SelectCurrentPlan = (planId: Plan['id']) => Plan | null

interface IProps {
  value: Plan[] | null
  children: ReactNode
}

const SelectCurrentPlanContext = createContext<SelectCurrentPlan | null>(null)

export const CurrentPlanProvider = ({ children, value }: IProps) => {
  const selectCurrentPlan = useCallback<SelectCurrentPlan>(
    (currentPlanId) => value?.find((plan) => plan.id === currentPlanId) ?? null,
    [value],
  )

  return (
    <SelectCurrentPlanContext.Provider value={selectCurrentPlan}>
      {children}
    </SelectCurrentPlanContext.Provider>
  )
}

export const useCurrentPlanSelector = () => {
  const selectCurrentPlan = use(SelectCurrentPlanContext)

  if (!selectCurrentPlan) {
    throw new Error('useCurrentPlanSelector must be used within <CurrentPlanProvider>')
  }

  return selectCurrentPlan
}
