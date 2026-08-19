import { useCallback, useMemo } from 'react'
import type { IPlan } from '../../../entities/plan/model/types'
import { PlanCard } from '../../../entities/plan/ui/plan-card'
import { Label } from '../../../shared/ui/text/label'

interface IProps {
  plans: IPlan[]
  selectedPlanId?: IPlan['id']
  onChange: (id: IPlan['id']) => void
}

export const PlanSelector = ({ plans, selectedPlanId, onChange }: IProps) => {
  const handleChange = useCallback(
    (id: IPlan['id']) => () => {
      onChange(id)
    },
    [onChange],
  )

  const planList = useMemo(
    () =>
      plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          selected={plan.id === selectedPlanId}
          onSelect={handleChange(plan.id)}
        />
      )),
    [plans, selectedPlanId, handleChange],
  )

  return (
    <>
      <Label>Choose your plan</Label>
      <div className="flex flex-col gap-4">{planList}</div>
    </>
  )
}
