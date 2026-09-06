import { Controller, useFormContext, useWatch } from 'react-hook-form'
import {
  CardFields,
  CardholderInput,
  CardNumberInput,
  CvcInput,
  ExpiryInput,
  Field,
  FieldGroup,
} from '@checkout-kit/ui'
import { detectCardBrand } from '@checkout-kit/core'
import type { CheckoutFormInput } from '../model/schema'

export const CardDetails = () => {
  const { control, formState } = useFormContext<CheckoutFormInput>()
  const number = useWatch({ control, name: 'card.number' })
  const errors = formState.errors.card

  // Amex asks for four digits rather than three, and the input has to know before the
  // shopper finds out the hard way.
  const brand = detectCardBrand(number ?? '').brand

  return (
    <FieldGroup legend="Card details">
      <CardFields>
        <Controller
          name="card.number"
          control={control}
          render={({ field }) => (
            <Field label="Card number" error={errors?.number?.message} required>
              {(control) => (
                <CardNumberInput
                  {...control}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              )}
            </Field>
          )}
        />

        <Controller
          name="card.holder"
          control={control}
          render={({ field }) => (
            <Field label="Name on card" error={errors?.holder?.message} required>
              {(control) => <CardholderInput {...control} {...field} />}
            </Field>
          )}
        />

        <div className="ck-card-fields__row">
          <Controller
            name="card.exp"
            control={control}
            render={({ field }) => (
              <Field label="Expiry date" hint="MM / YY" error={errors?.exp?.message} required>
                {(control) => (
                  <ExpiryInput
                    {...control}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                )}
              </Field>
            )}
          />

          <Controller
            name="card.cvc"
            control={control}
            render={({ field }) => (
              <Field
                label="Security code"
                hint={brand === 'amex' ? '4 digits on the front' : '3 digits on the back'}
                error={errors?.cvc?.message}
                required
              >
                {(control) => (
                  <CvcInput
                    {...control}
                    brand={brand}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                )}
              </Field>
            )}
          />
        </div>
      </CardFields>
    </FieldGroup>
  )
}
