import { Details, Item } from '@/shared/ui'
import { useFormContext, useWatch } from 'react-hook-form'
import type { CheckoutFormSchema } from '../model/schema'
import { useCurrentPlanSelector } from '../model/plan-context'
import { useMemo } from 'react'
import { toInvoice } from '../model/to-invoice'

export const CheckoutDetails = () => {
  const { control } = useFormContext<CheckoutFormSchema>()

  const selectCurrentPlan = useCurrentPlanSelector()

  const planId = useWatch({
    control,
    name: 'planId',
  })

  const currentPlan = useMemo(() => selectCurrentPlan(planId), [selectCurrentPlan, planId])

  const invoice = useMemo(() => (currentPlan ? toInvoice(currentPlan) : null), [currentPlan])

  if (!invoice) {
    return null
  }

  return (
    <Details>
      <Item name="Price" value={`${invoice.currency}${invoice.subtotal}`} />
      {!!invoice.discount && <Item name="Discount" value={invoice.discount} />}
      <Item name="Total due" variant="secondary" value={`${invoice.currency}${invoice.total}`} />
    </Details>
  )
}
