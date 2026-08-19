import { useFormContext } from 'react-hook-form'
import { Input } from '../../../shared/ui/input'
import { FormDetail } from '../../../shared/ui/text/form-detail'
import { Label } from '../../../shared/ui/text/label'
import type { CheckoutFormSchema } from '../model/schema'

export const CreditCardDetails = () => {
  const { register } = useFormContext<CheckoutFormSchema>()

  return (
    <>
      <Label>Credit card details</Label>

      <div className="flex flex-col gap-2">
        <div className="flex">
          <Input
            autoComplete="cc-exp"
            placeholder="MM / YYYY"
            maxLength={7}
            {...register('card.exp')}
          />
        </div>
        <div className="flex gap-2 pb-2 flex-wrap">
          <Input
            type="text"
            autoComplete="cc-number"
            pattern="\d*"
            placeholder="0000 0000 0000 0000"
            maxLength={16}
            {...register('card.number')}
          />
          <Input
            autoComplete="cc-csc"
            placeholder="CVC"
            type="text"
            pattern="\d*"
            maxLength={3}
            {...register('card.cvc')}
          />
        </div>
        <FormDetail>
          By providing your card information, you allow us to charge your card for future payments
          in accordance with their terms.
        </FormDetail>
      </div>
    </>
  )
}
