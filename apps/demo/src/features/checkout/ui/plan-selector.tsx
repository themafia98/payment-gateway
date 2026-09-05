import { useFormContext, useWatch } from 'react-hook-form'
import { OptionCard, OptionCardGroup } from '@checkout-kit/ui'
import type { Plan } from '@/entities/plan'
import type { CheckoutFormInput } from '../model/schema'

interface PlanSelectorProps {
  plans: Plan[]
}

export const PlanSelector = ({ plans }: PlanSelectorProps) => {
  const { control, setValue } = useFormContext<CheckoutFormInput>()
  const planId = useWatch({ control, name: 'planId' })

  return (
    <OptionCardGroup
      label="Choose your plan"
      value={planId}
      onChange={(id) =>
        setValue('planId', id, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
      }
    >
      {plans.map((plan) => (
        <OptionCard
          key={plan.id}
          value={plan.id}
          label={plan.name}
          badge={plan.discount}
          aside={`${plan.currency}${plan.price}`}
        />
      ))}
    </OptionCardGroup>
  )
}
