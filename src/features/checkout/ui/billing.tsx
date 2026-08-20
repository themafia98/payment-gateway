import { useFormContext } from 'react-hook-form'
import { Input, Label } from '@/shared/ui'
import type { CheckoutFormSchema } from '../model/schema'

export const Billing = () => {
  const { register } = useFormContext<CheckoutFormSchema>()

  return (
    <>
      <Label>Billing</Label>

      <div className="flex flex-col gap-2">
        <div className="flex">
          <Input
            autoComplete="country-name"
            placeholder="Country"
            {...register('billing.country')}
          />
        </div>
        <div className="flex">
          <Input
            autoComplete="postal-code"
            placeholder="Postal code"
            {...register('billing.postalCode')}
          />
        </div>
      </div>
    </>
  )
}
