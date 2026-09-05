import { Tab, Tabs, ErrorMessage } from '@/shared/ui'
import type { PaymentMethod } from '@/entities/payment-method'
import type { CheckoutFormSchema } from '../model/schema'
import { useFormContext, useWatch } from 'react-hook-form'

export const PaymentMethodSelector = () => {
  const { setValue, control } = useFormContext<CheckoutFormSchema>()

  const paymentMethod = useWatch({
    control,
    name: 'paymentMethod',
  })

  return (
    <>
      <Tabs
        aria-label="Payment method"
        value={paymentMethod}
        onValueChange={(method) => setValue('paymentMethod', method as PaymentMethod)}
      >
        <Tab value="Card">Card</Tab>
        <Tab value="Bank Transfer">Bank Transfer</Tab>
      </Tabs>
      <ErrorMessage name="paymentMethod" />
    </>
  )
}
