import { Details, Item } from '@/shared/ui'
import { useFormContext, useWatch } from 'react-hook-form'
import type { CheckoutFormSchema } from '../model/schema'
import { useMemo } from 'react'
import type { Plan } from '@/entities/plan'
import { toInvoice } from '../model/to-invoice'

interface IProps {
  plans: Plan[]
}

export const CheckoutDetails = ({ plans }: IProps) => {
  const { control } = useFormContext<CheckoutFormSchema>()

  const planId = useWatch({
    control,
    name: 'planId',
  })

  const invoice = useMemo(() => {
    const currentPlan = plans.find((plan) => plan.id === planId)

    return currentPlan ? toInvoice(currentPlan) : null
  }, [plans, planId])

  if (!invoice) {
    return null
  }

  return (
    <Details>
      <Item name="Price" value={`${invoice.currency}${invoice.subtotal}`} />
      {!!invoice.discount && <Item name="Discount applied" value={invoice.discount} />}
      <Item name="Total due" variant="secondary" value={`${invoice.currency}${invoice.total}`} />
    </Details>
  )
}
