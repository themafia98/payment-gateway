import * as z from 'zod'
import { isCardNumber, normalizeCardNumber, createBranded, isCardExpiration } from '@/shared/lib'

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

export const checkoutFormSchema = z.object({
  planId: z.string().min(1, 'Plan is required'),

  paymentMethod: z.enum(['Card', 'Bank Transfer']),

  card: z.object({
    number: cardNumberSchema,

    exp: expirationSchema,

    cvc: z.string().regex(/^\d{3}$/, 'CVC must contain 3 digits'),
  }),

  billing: z.object({
    country: z.string().min(2, 'Country is required'),

    postalCode: z.string().min(3, 'Postal Code is required'),
  }),
})

export type CheckoutFormInput = z.input<typeof checkoutFormSchema>

export type CheckoutFormSchema = z.output<typeof checkoutFormSchema>
