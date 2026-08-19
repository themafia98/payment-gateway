import type { IPlan } from '../../../entities/plan/model/types'
import { PlanCard } from '../../../entities/plan/ui/plan-card'
import { Label } from '../../../shared/ui/label'

interface IProps {
  plans: IPlan[]
  selectedPlanId?: IPlan['id']
  onChange: (id: IPlan['id']) => void
}

export const PlanSelector = ({ plans, selectedPlanId, onChange }: IProps) => {
  return (
    <>
      <Label>Choose your plan</Label>
      <div className="flex flex-col gap-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={plan.id === selectedPlanId}
            onSelect={() => onChange(plan.id)}
          />
        ))}
      </div>
    </>
  )
}
