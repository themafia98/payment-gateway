import * as z from 'zod'
import {
  isCardNumber,
  normalizeCardNumber,
  createBranded,
  isCardExpiration,
  isCVC,
} from '@/shared/lib'

const cardNumberSchema = z
  .string()
  .min(1, 'Card Number is required')
  .transform(normalizeCardNumber)
  .refine((value) => /^\d{16}$/.test(value), 'Card Number must contain 16 digits')
  .refine(isCardNumber, 'Invalid card number')
  .transform((value) => createBranded<string, 'CardNumber'>(value))

const expirationSchema = z
  .string()
  .min(1, 'Expiration date is required')
  .refine(isCardExpiration, 'Card is expired')
  .transform((value) => createBranded<string, 'CardExpiration'>(value))

const cvcSchema = z
  .string()
  .refine(isCVC, 'CVC must contain 3 digits')
  .transform((value) => createBranded<string, 'CvcCode'>(value))

const cardSchema = z.object({
  number: cardNumberSchema,
  exp: expirationSchema,
  cvc: cvcSchema,
})

/**
 * The checkout form, shaped by what the chosen provider actually collects.
 *
 * Some integrations take the card here; a hosted payment page takes it on the bank's own
 * site and a wallet takes it from the device, and asking for one in those cases would be
 * both pointless and, for the fields that never get sent anywhere, faintly dishonest.
 *
 * The output type is the same either way - `card` is simply absent - so nothing
 * downstream branches on which variant produced it.
 */
export const createCheckoutFormSchema = (collectsCard: boolean) =>
  z
    .object({
      planId: z.string().min(1, 'Plan is required'),

      paymentMethod: z.enum(['Card', 'Bank Transfer']),

      // The fields always exist in the form's state, so the inputs stay bound the same way
      // either way; whether they are validated - and whether they are rendered at all -
      // depends on the provider.
      card: z.object({ number: z.string(), exp: z.string(), cvc: z.string() }),

      billing: z.object({
        country: z.string().min(2, 'Country is required'),

        postalCode: z.string().min(3, 'Postal Code is required'),
      }),
    })
    .superRefine((value, ctx) => {
      if (!collectsCard) return

      const parsed = cardSchema.safeParse(value.card)
      if (parsed.success) return

      for (const issue of parsed.error.issues) {
        ctx.addIssue({ ...issue, path: ['card', ...issue.path] })
      }
    })
    .transform((value) => ({
      ...value,
      card: collectsCard ? cardSchema.parse(value.card) : undefined,
    }))

export const checkoutFormSchema = createCheckoutFormSchema(true)

export type CheckoutFormInput = z.input<typeof checkoutFormSchema>

export type CheckoutFormSchema = z.output<typeof checkoutFormSchema>
