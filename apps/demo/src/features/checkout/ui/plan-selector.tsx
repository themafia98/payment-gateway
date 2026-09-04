import { useCallback, useMemo } from 'react'
import { PlanCard, type Plan } from '@/entities/plan'
import { Label } from '@/shared/ui'
import type { CheckoutFormSchema } from '../model/schema'
import { useFormContext, useWatch } from 'react-hook-form'

type PlanId = Plan['id']

interface IProps {
  plans: Plan[]
}

export const PlanSelector = ({ plans }: IProps) => {
  const { setValue, control } = useFormContext<CheckoutFormSchema>()

  const activePlanId = useWatch({
    control,
    name: 'planId',
  })

  const handleSwitch = useCallback(
    (id: PlanId) => () => {
      setValue('planId', id)
    },
    [setValue],
  )

  const planList = useMemo(
    () =>
      plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          selected={plan.id === activePlanId}
          onSelect={handleSwitch(plan.id)}
        />
      )),
    [plans, activePlanId, handleSwitch],
  )

  return (
    <>
      <Label>Choose your plan</Label>
      <div className="flex flex-col gap-4">{planList}</div>
    </>
  )
}
