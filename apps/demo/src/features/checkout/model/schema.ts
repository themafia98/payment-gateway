import * as z from 'zod'
import {
  detectCardBrand,
  parseExpiry,
  validateCardNumber,
  validateCardholder,
  validateCvc,
  type CardExpiration,
  type CardNumber,
  type CardholderIssue,
  type CardNumberIssue,
  type CvcIssue,
  type CvcCode,
  type ExpiryIssue,
} from '@checkout-kit/core'
import { isPostalCode } from './postal'

// The rules live in the kit; only the wording is ours. That is what keeps the mask and the
// validator from disagreeing, and what makes these messages translatable.

const CARD_NUMBER: Record<CardNumberIssue, string> = {
  required: 'Enter your card number',
  incomplete: 'This card number is too short',
  invalid_number: 'Check the card number and try again',
  unsupported_brand: 'We cannot accept this card',
}

const EXPIRY: Record<ExpiryIssue, string> = {
  required: 'Enter the expiry date',
  invalid_format: 'Use the format shown on the card, MM / YY',
  invalid_month: 'There is no such month',
  expired: 'This card has expired',
  too_far_future: 'Check the expiry year',
}

const CVC: Record<CvcIssue, string> = {
  required: 'Enter the security code',
  invalid_length: 'The security code is the wrong length',
}

const CARDHOLDER: Record<CardholderIssue, string> = {
  required: 'Enter the name on the card',
  too_short: 'Enter the full name on the card',
  invalid_characters: 'A name cannot contain digits or symbols',
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const base = z.object({
  planId: z.string().min(1, 'Choose a plan'),

  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .refine((value) => EMAIL.test(value), 'Check the email address'),

  // Always present so the inputs stay bound the same way; validated only when the chosen
  // provider actually collects a card.
  card: z.object({
    number: z.string(),
    exp: z.string(),
    cvc: z.string(),
    holder: z.string(),
  }),

  billing: z.object({
    country: z.string().min(2, 'Choose a country'),
    postalCode: z.string().trim().min(1, 'Enter your postal code'),
  }),
})

type Base = z.output<typeof base>

export interface CheckoutCard {
  readonly number: CardNumber
  readonly exp: CardExpiration
  readonly cvc: CvcCode
  readonly holder: string
}

const toCard = (card: Base['card']): CheckoutCard => {
  const number = validateCardNumber(card.number)
  const expiry = parseExpiry(card.exp)
  const cvc = validateCvc(card.cvc, number.ok ? number.brand : undefined)
  const holder = validateCardholder(card.holder)

  if (!number.ok || !expiry.ok || !cvc.ok || !holder.ok) {
    throw new Error('The card did not validate.')
  }

  return { number: number.digits, exp: expiry.value, cvc: cvc.cvc, holder: holder.value }
}

const createSchema = (collectsCard: boolean) =>
  base
    .superRefine((value, ctx) => {
      if (!isPostalCode(value.billing.country, value.billing.postalCode)) {
        ctx.addIssue({
          code: 'custom',
          path: ['billing', 'postalCode'],
          message: 'Check the postal code for this country',
        })
      }

      if (!collectsCard) return

      const number = validateCardNumber(value.card.number)
      if (!number.ok) {
        ctx.addIssue({
          code: 'custom',
          path: ['card', 'number'],
          message: CARD_NUMBER[number.issue],
        })
      }

      const expiry = parseExpiry(value.card.exp)
      if (!expiry.ok) {
        ctx.addIssue({ code: 'custom', path: ['card', 'exp'], message: EXPIRY[expiry.issue] })
      }

      // The brand decides how long the code is, so it is checked here where the number is
      // also in scope rather than on the field alone.
      const brand = number.ok ? number.brand : detectCardBrand(value.card.number).brand
      const cvc = validateCvc(value.card.cvc, brand)
      if (!cvc.ok) {
        ctx.addIssue({ code: 'custom', path: ['card', 'cvc'], message: CVC[cvc.issue] })
      }

      const holder = validateCardholder(value.card.holder)
      if (!holder.ok) {
        ctx.addIssue({
          code: 'custom',
          path: ['card', 'holder'],
          message: CARDHOLDER[holder.issue],
        })
      }
    })
    .transform((value) => ({
      ...value,
      card: collectsCard ? toCard(value.card) : undefined,
    }))

// Both built once, at module scope: a schema rebuilt on every render hands the form a new
// resolver each time and throws its validation state away with it.
export const CARD_CHECKOUT_SCHEMA = createSchema(true)
export const CARDLESS_CHECKOUT_SCHEMA = createSchema(false)

export const checkoutSchemaFor = (collectsCard: boolean): typeof CARD_CHECKOUT_SCHEMA =>
  collectsCard ? CARD_CHECKOUT_SCHEMA : CARDLESS_CHECKOUT_SCHEMA

export type CheckoutFormInput = z.input<typeof CARD_CHECKOUT_SCHEMA>

export type CheckoutFormSchema = z.output<typeof CARD_CHECKOUT_SCHEMA>
