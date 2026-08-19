import * as z from 'zod'

export const checkoutFormSchema = z.object({
  planId: z
    .string()
    .min(1, 'Plan is required')
    .nullable()
    .refine((value) => !!value, {
      message: 'Plan is required',
    }),
  paymentMethod: z.enum(['Card', 'Bank Transfer']),
  card: z.object({
    number: z
      .number()
      .min(16, 'Card Number is required')
      .max(16, 'Card Number is required')
      .nullable()
      .refine((value) => !!value, {
        message: 'Card Number is required',
      }),
    exp: z
      .string()
      .min(7, 'Date is required')
      .max(8, 'Cvc is required')
      .nullable()
      .refine((value) => !!value, {
        message: 'Date is required',
      }),
    cvc: z
      .string()
      .min(3, 'Cvc is required')
      .max(3, 'Cvc is required')
      .nullable()
      .refine((value) => !!value, {
        message: 'Cvc is required',
      }),
  }),
  billing: z.object({
    country: z
      .string()
      .min(2, 'Country is required')
      .nullable()
      .refine((value) => !!value, {
        message: 'Country is required',
      }),
    postalCode: z
      .string()
      .min(3, 'Postal Code is required')
      .max(3, 'Postal Code is required')
      .nullable()
      .refine((value) => !!value, {
        message: 'Postal Code is required',
      }),
  }),
})

export type CheckoutFormSchema = z.infer<typeof checkoutFormSchema>
