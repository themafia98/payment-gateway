import { Tab, Tabs } from '@/shared/ui'
import type { PaymentMethod } from '@/entities/payment-method'
import type { CheckoutFormSchema } from '../model/schema'
import { useFormContext, useWatch } from 'react-hook-form'

export const PaymentMethodSelector = () => {
  const { setValue, control } = useFormContext<CheckoutFormSchema>()

  const paymentMethod = useWatch({
    control,
    name: 'paymentMethod',
  })

  const handleSwitch = (type: PaymentMethod) => () => {
    setValue('paymentMethod', type)
  }

  return (
    <Tabs>
      <Tab onClick={handleSwitch('Card')} isActive={paymentMethod === 'Card'}>
        Card
      </Tab>
      <Tab onClick={handleSwitch('Bank Transfer')} isActive={paymentMethod === 'Bank Transfer'}>
        Bank Transfer
      </Tab>
    </Tabs>
  )
}
