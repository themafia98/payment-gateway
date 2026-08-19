import * as z from 'zod'

export const checkoutFormSchema = z.object({
  planId: z.string().min(1, 'Plan is required'),

  paymentMethod: z.enum(['Card', 'Bank Transfer']),

  card: z.object({
    number: z
      .string()
      .min(1, 'Card Number is required')
      .regex(/^\d{16}$/, 'Card Number must contain 16 digits'),

    exp: z
      .string()
      .min(1, 'Date is required')
      .regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Invalid expiration date'),

    cvc: z.string().regex(/^\d{3}$/, 'CVC must contain 3 digits'),
  }),

  billing: z.object({
    country: z.string().min(2, 'Country is required'),

    postalCode: z.string().min(3, 'Postal Code is required'),
  }),
})

export type CheckoutFormSchema = z.infer<typeof checkoutFormSchema>
