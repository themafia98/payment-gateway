import { useFormContext } from 'react-hook-form'
import { Input, Label } from '@/shared/ui'
import type { CheckoutFormSchema } from '../model/schema'
import { ErrorMessage } from '@hookform/error-message'

export const Billing = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<CheckoutFormSchema>()

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
        <ErrorMessage as="p" errors={errors} name="billing.country" />
        <div className="flex">
          <Input
            autoComplete="postal-code"
            placeholder="Postal code"
            {...register('billing.postalCode')}
          />
        </div>
        <ErrorMessage as="p" errors={errors} name="billing.postalCode" />
      </div>
    </>
  )
}
