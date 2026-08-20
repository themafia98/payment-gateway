import { Controller, useFormContext } from 'react-hook-form'
import { Input, FormDetail, Label } from '@/shared/ui'
import { normalizeCVC } from '@/shared/lib'
import type { CheckoutFormInput } from '../../model/schema'
import { CreditCardInput } from './credit-card-input'
import { CardExpirationInput } from './card-expiration-input'

export const CreditCardDetails = () => {
  const { control } = useFormContext<CheckoutFormInput>()

  return (
    <>
      <Label>Credit card details</Label>

      <div className="flex flex-col gap-2">
        <div className="flex">
          <Controller
            name="card.exp"
            control={control}
            render={({ field }) => (
              <CardExpirationInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </div>

        <div className="flex gap-2 pb-2 flex-wrap">
          <Controller
            name="card.number"
            control={control}
            render={({ field }) => (
              <CreditCardInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />

          <Controller
            name="card.cvc"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="CVC"
                maxLength={3}
                value={field.value}
                onChange={(event) => {
                  field.onChange(normalizeCVC(event.target.value))
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
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
