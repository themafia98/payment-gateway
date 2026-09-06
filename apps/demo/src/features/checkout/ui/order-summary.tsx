import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Details, Item } from '@checkout-kit/ui'
import type { Plan } from '@/entities/plan'
import { toInvoice } from '../model/to-invoice'
import type { CheckoutFormInput } from '../model/schema'

interface OrderSummaryProps {
  plans: Plan[]
}

export const OrderSummary = ({ plans }: OrderSummaryProps) => {
  const { control } = useFormContext<CheckoutFormInput>()
  const planId = useWatch({ control, name: 'planId' })

  const invoice = useMemo(() => {
    const plan = plans.find((candidate) => candidate.id === planId)
    return plan ? toInvoice(plan) : null
  }, [plans, planId])

  if (!invoice) return null

  return (
    <div className="ck-panel">
      <h2 className="ck-section__title">Order summary</h2>
      <Details>
        <Item name="Price" value={`${invoice.currency}${invoice.subtotal}`} />
        {invoice.discount ? <Item name="Discount applied" value={invoice.discount} /> : null}
        <Item name="Total due" total value={`${invoice.currency}${invoice.total}`} />
      </Details>
    </div>
  )
}
