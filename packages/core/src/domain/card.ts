// Card rules, shared by the input mask and whatever validates the form. Pure, so they also
// run on a server. Two copies of these rules drift apart eventually.

import { createBranded, type CardExpiration, type CardNumber, type CvcCode } from './brand'

export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'diners'
  | 'jcb'
  | 'unionpay'
  | 'maestro'
  | 'mir'
  | 'unknown'

export interface CardBrandRule {
  readonly brand: CardBrand
  readonly displayName: string
  /** Leading digits compared as numbers: [51, 55] matches 51-55, [222100, 272099] on six. */
  readonly ranges: readonly (readonly [number, number])[]
  readonly lengths: readonly number[]
  readonly cvcLengths: readonly number[]
  /** Digit counts a space goes after: most cards group 4-4-4-4, Amex groups 4-6-5. */
  readonly gaps: readonly number[]
  readonly luhn: boolean
}

/** A prefix to match: one number, or a range of them. */
type Prefix = number | readonly [from: number, to: number]

interface BrandSpec {
  readonly brand: CardBrand
  readonly displayName: string
  readonly prefixes: readonly Prefix[]
  readonly lengths: readonly number[]
  readonly cvcLengths?: readonly number[]
  readonly gaps?: readonly number[]
  readonly luhn?: boolean
}

/** `lengths: between(16, 19)` reads better than spelling all four out. */
const between = (from: number, to: number): readonly number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index)

const define = (spec: BrandSpec): CardBrandRule => ({
  brand: spec.brand,
  displayName: spec.displayName,
  ranges: spec.prefixes.map((prefix) => (typeof prefix === 'number' ? [prefix, prefix] : prefix)),
  lengths: spec.lengths,
  cvcLengths: spec.cvcLengths ?? [3],
  gaps: spec.gaps ?? [4, 8, 12],
  luhn: spec.luhn ?? true,
})

/** Order matters: the first brand whose prefix matches wins, so narrow ones come first. */
export const CARD_BRANDS: readonly CardBrandRule[] = [
  define({
    brand: 'amex',
    displayName: 'Amex',
    prefixes: [34, 37],
    lengths: [15],
    cvcLengths: [4],
    gaps: [4, 10],
  }),
  define({
    brand: 'diners',
    displayName: 'Diners Club',
    prefixes: [[300, 305], 3095, 36, [38, 39]],
    lengths: [14, 16, 19],
    gaps: [4, 10],
  }),
  define({
    brand: 'jcb',
    displayName: 'JCB',
    prefixes: [[3528, 3589]],
    lengths: between(16, 19),
  }),
  define({
    brand: 'visa',
    displayName: 'Visa',
    prefixes: [4],
    lengths: [13, 16, 19],
  }),
  define({
    brand: 'mastercard',
    displayName: 'Mastercard',
    prefixes: [
      [51, 55],
      [222100, 272099],
    ],
    lengths: [16],
  }),
  define({
    brand: 'mir',
    displayName: 'Mir',
    prefixes: [[2200, 2204]],
    lengths: between(16, 19),
  }),
  define({
    brand: 'discover',
    displayName: 'Discover',
    prefixes: [6011, [644, 649], 65, [622126, 622925]],
    lengths: [16, 19],
  }),
  define({
    brand: 'unionpay',
    displayName: 'UnionPay',
    prefixes: [62, 81],
    lengths: between(16, 19),
  }),
  define({
    brand: 'maestro',
    displayName: 'Maestro',
    prefixes: [5018, 5020, 5038, [56, 69]],
    lengths: between(12, 19),
  }),
]

/** Before the brand is clear, and for cards no rule covers. Permissive on purpose. */
export const UNKNOWN_CARD_BRAND: CardBrandRule = define({
  brand: 'unknown',
  displayName: 'Card',
  prefixes: [],
  lengths: between(12, 19),
  cvcLengths: [3, 4],
})

export const onlyDigits = (value: string): string => value.replace(/\D/g, '')

const matches = (digits: string, [from, to]: readonly [number, number]): boolean => {
  const width = String(from).length
  if (digits.length < width) return false
  const head = Number(digits.slice(0, width))
  return head >= from && head <= to
}

export const detectCardBrand = (value: string): CardBrandRule => {
  const digits = onlyDigits(value)
  if (!digits) return UNKNOWN_CARD_BRAND

  return (
    CARD_BRANDS.find((candidate) => candidate.ranges.some((range) => matches(digits, range))) ??
    UNKNOWN_CARD_BRAND
  )
}

const ruleFor = (brand?: CardBrand): CardBrandRule =>
  CARD_BRANDS.find((candidate) => candidate.brand === brand) ?? UNKNOWN_CARD_BRAND

/** The check digit every card number carries. Catches a mistyped digit, not a stolen card. */
export const luhn = (digits: string): boolean => {
  if (!/^\d+$/.test(digits)) return false

  let sum = 0
  let double = false

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = digits.charCodeAt(index) - 48
    if (double) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    double = !double
  }

  return sum % 10 === 0
}

export const maxCardNumberLength = (brand?: CardBrand): number => {
  const lengths = brand ? ruleFor(brand).lengths : UNKNOWN_CARD_BRAND.lengths
  return Math.max(...lengths)
}

export const cvcLengthsFor = (brand?: CardBrand): readonly number[] =>
  brand ? ruleFor(brand).cvcLengths : UNKNOWN_CARD_BRAND.cvcLengths

/** Groups the digits the way the card is printed: 4-4-4-4, or 4-6-5 for Amex. */
export const formatCardNumber = (value: string, brand?: CardBrand): string => {
  const detected = brand ? ruleFor(brand) : detectCardBrand(value)
  const digits = onlyDigits(value).slice(0, Math.max(...detected.lengths))
  if (!digits) return ''

  const parts: string[] = []
  let start = 0
  for (const gap of detected.gaps) {
    if (digits.length <= gap) break
    parts.push(digits.slice(start, gap))
    start = gap
  }
  parts.push(digits.slice(start))

  return parts.join(' ')
}

export type CardNumberIssue = 'required' | 'incomplete' | 'invalid_number' | 'unsupported_brand'

export type CardNumberResult =
  | {
      readonly ok: true
      readonly brand: CardBrand
      readonly digits: CardNumber
      readonly last4: string
    }
  | { readonly ok: false; readonly issue: CardNumberIssue; readonly brand: CardBrand }

export interface ValidateCardNumberOptions {
  /** Brands this merchant accepts. Anything else is `unsupported_brand`, not `invalid`. */
  readonly brands?: readonly CardBrand[]
}

export const validateCardNumber = (
  value: string,
  options: ValidateCardNumberOptions = {},
): CardNumberResult => {
  const digits = onlyDigits(value)
  const detected = detectCardBrand(digits)

  if (!digits) return { ok: false, issue: 'required', brand: detected.brand }

  if (options.brands && !options.brands.includes(detected.brand)) {
    return { ok: false, issue: 'unsupported_brand', brand: detected.brand }
  }

  // Too short for anything this brand issues: the shopper is still typing.
  if (digits.length < Math.min(...detected.lengths)) {
    return { ok: false, issue: 'incomplete', brand: detected.brand }
  }

  if (!detected.lengths.includes(digits.length)) {
    return { ok: false, issue: 'invalid_number', brand: detected.brand }
  }

  if (detected.luhn && !luhn(digits)) {
    return { ok: false, issue: 'invalid_number', brand: detected.brand }
  }

  return {
    ok: true,
    brand: detected.brand,
    digits: createBranded<string, 'CardNumber'>(digits),
    last4: digits.slice(-4),
  }
}

export type ExpiryIssue =
  'required' | 'invalid_format' | 'invalid_month' | 'expired' | 'too_far_future'

export type ExpiryResult =
  | {
      readonly ok: true
      readonly month: number
      readonly year: number
      readonly value: CardExpiration
    }
  | { readonly ok: false; readonly issue: ExpiryIssue }

export interface ParseExpiryOptions {
  /** Injected so the boundary - a card works through the last day of its month - is testable. */
  readonly now?: Date
  readonly maxYearsAhead?: number
}

/** `MM / YY`, the way it is printed on the card. Accepts any separator, or none. */
export const parseExpiry = (value: string, options: ParseExpiryOptions = {}): ExpiryResult => {
  const digits = onlyDigits(value)
  if (!digits) return { ok: false, issue: 'required' }
  if (digits.length !== 4) return { ok: false, issue: 'invalid_format' }

  const month = Number(digits.slice(0, 2))
  if (month < 1 || month > 12) return { ok: false, issue: 'invalid_month' }

  // Two digits, so 2000-2099. No card is issued with an eighty-year life.
  const year = 2000 + Number(digits.slice(2))
  const now = options.now ?? new Date()
  const currentMonths = now.getFullYear() * 12 + now.getMonth()
  const expiryMonths = year * 12 + (month - 1)

  if (expiryMonths < currentMonths) return { ok: false, issue: 'expired' }

  const maxYearsAhead = options.maxYearsAhead ?? 20
  if (expiryMonths > currentMonths + maxYearsAhead * 12) {
    return { ok: false, issue: 'too_far_future' }
  }

  return {
    ok: true,
    month,
    year,
    value: createBranded<string, 'CardExpiration'>(
      `${String(month).padStart(2, '0')} / ${String(year % 100).padStart(2, '0')}`,
    ),
  }
}

export const formatExpiry = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`
}

export type CvcIssue = 'required' | 'invalid_length'

export type CvcResult =
  | { readonly ok: true; readonly cvc: CvcCode }
  | { readonly ok: false; readonly issue: CvcIssue; readonly expectedLengths: readonly number[] }

export const validateCvc = (value: string, brand?: CardBrand): CvcResult => {
  const expectedLengths = cvcLengthsFor(brand)
  const digits = onlyDigits(value)

  if (!digits) return { ok: false, issue: 'required', expectedLengths }
  if (!expectedLengths.includes(digits.length)) {
    return { ok: false, issue: 'invalid_length', expectedLengths }
  }

  return { ok: true, cvc: createBranded<string, 'CvcCode'>(digits) }
}

export type CardholderIssue = 'required' | 'too_short' | 'invalid_characters'

export type CardholderResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly issue: CardholderIssue }

// Letters in any script, plus the punctuation names actually contain. Deliberately not
// stricter: a name is not a format, and rejecting a real one is worse than accepting a typo.
const CARDHOLDER = /^[\p{L}\p{M} .,'-]+$/u

export const validateCardholder = (value: string): CardholderResult => {
  const trimmed = value.trim().replace(/\s+/g, ' ')

  if (!trimmed) return { ok: false, issue: 'required' }
  if (trimmed.length < 2) return { ok: false, issue: 'too_short' }
  if (!CARDHOLDER.test(trimmed)) return { ok: false, issue: 'invalid_characters' }

  return { ok: true, value: trimmed }
}

export const last4 = (value: string): string => onlyDigits(value).slice(-4)

/** For display only - a saved card in a list, a confirmation screen. Never sent anywhere. */
export const maskCardNumber = (value: string): string => {
  const digits = onlyDigits(value)
  if (digits.length <= 4) return digits
  return `•••• ${digits.slice(-4)}`
}
