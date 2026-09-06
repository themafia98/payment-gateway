import { useFormContext } from 'react-hook-form'
import { Field, FieldGroup, Input } from '@checkout-kit/ui'
import { COUNTRIES } from '../model/countries'
import type { CheckoutFormInput } from '../model/schema'

export const BillingFields = () => {
  const { register, formState } = useFormContext<CheckoutFormInput>()
  const errors = formState.errors

  return (
    <FieldGroup legend="Billing address" hint="Your bank checks this against your card.">
      <Field label="Email" error={errors.email?.message} required>
        {(control) => (
          <Input
            {...control}
            {...register('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        )}
      </Field>

      <Field label="Country" error={errors.billing?.country?.message} required>
        {(control) => (
          <select {...control} {...register('billing.country')} className="ck-input">
            <option value="">Choose a country</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Postal code" error={errors.billing?.postalCode?.message} required>
        {(control) => (
          <Input
            {...control}
            {...register('billing.postalCode')}
            autoComplete="postal-code"
            placeholder="Postal code"
          />
        )}
      </Field>
    </FieldGroup>
  )
}
