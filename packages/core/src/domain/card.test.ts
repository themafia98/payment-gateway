import { describe, expect, it } from 'vitest'
import {
  cvcLengthsFor,
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  last4,
  luhn,
  maskCardNumber,
  maxCardNumberLength,
  onlyDigits,
  parseExpiry,
  validateCardholder,
  validateCardNumber,
  validateCvc,
  type CardBrand,
} from './card'

/** One real-shaped number per brand. All pass Luhn; none is anyone's card. */
const NUMBERS: Record<Exclude<CardBrand, 'unknown'>, string> = {
  visa: '4242424242424242',
  mastercard: '5555555555554444',
  amex: '378282246310005',
  discover: '6011111111111117',
  diners: '30569309025904',
  jcb: '3530111333300000',
  unionpay: '6200000000000005',
  maestro: '6759649826438453',
  mir: '2200000000000053',
}

const NOW = new Date('2026-09-05T12:00:00Z')

describe('detectCardBrand', () => {
  it.each(Object.entries(NUMBERS))('recognises %s', (brand, number) => {
    expect(detectCardBrand(number).brand).toBe(brand)
  })

  it('recognises a brand from the first digits, before the number is complete', () => {
    // The mask has to change to 4-6-5 while the shopper is still typing.
    expect(detectCardBrand('3782').brand).toBe('amex')
    expect(detectCardBrand('4').brand).toBe('visa')
  })

  it('falls back to unknown rather than guessing', () => {
    expect(detectCardBrand('9999999999999999').brand).toBe('unknown')
    expect(detectCardBrand('').brand).toBe('unknown')
  })

  it('reads two-digit and six-digit ranges as numbers', () => {
    // 2221-2720 is Mastercard; 2200-2204 is Mir. A string prefix match confuses these.
    expect(detectCardBrand('2221000000000009').brand).toBe('mastercard')
    expect(detectCardBrand('2200000000000053').brand).toBe('mir')
  })
})

describe('luhn', () => {
  it.each(Object.values(NUMBERS))('accepts %s', (number) => {
    expect(luhn(number)).toBe(true)
  })

  it('rejects a number with one digit mistyped', () => {
    expect(luhn('4242424242424243')).toBe(false)
  })

  it('rejects anything that is not digits', () => {
    expect(luhn('4242 4242 4242 4242')).toBe(false)
    expect(luhn('')).toBe(false)
  })
})

describe('formatCardNumber', () => {
  it('groups most cards in fours', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242')
  })

  it('groups Amex the way it is printed', () => {
    expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005')
  })

  it('formats what has been typed so far, without padding', () => {
    expect(formatCardNumber('4242')).toBe('4242')
    expect(formatCardNumber('42424')).toBe('4242 4')
  })

  it('stops at the longest number the brand issues', () => {
    // Amex is 15; the sixteenth keystroke must not land.
    expect(onlyDigits(formatCardNumber('3782822463100051234'))).toHaveLength(15)
  })

  it('is idempotent and never loses a digit', () => {
    const once = formatCardNumber('4242424242424242')
    expect(formatCardNumber(once)).toBe(once)
    expect(onlyDigits(once)).toBe('4242424242424242')
  })
})

describe('validateCardNumber', () => {
  it('accepts a good number and reports the brand and last four', () => {
    const result = validateCardNumber('4242 4242 4242 4242')

    expect(result).toMatchObject({ ok: true, brand: 'visa', last4: '4242' })
  })

  it.each(Object.entries(NUMBERS))('accepts a %s number', (_brand, number) => {
    expect(validateCardNumber(number).ok).toBe(true)
  })

  it('accepts a 15-digit Amex', () => {
    // The old rule was exactly 16 digits, which turned every Amex away.
    expect(validateCardNumber('378282246310005')).toMatchObject({ ok: true, brand: 'amex' })
  })

  it('calls an empty value required, not invalid', () => {
    expect(validateCardNumber('')).toMatchObject({ ok: false, issue: 'required' })
  })

  it('calls a half-typed number incomplete, so it is not scolded mid-entry', () => {
    expect(validateCardNumber('4242 4242')).toMatchObject({ ok: false, issue: 'incomplete' })
  })

  it('rejects a number that fails the check digit', () => {
    expect(validateCardNumber('4242424242424243')).toMatchObject({
      ok: false,
      issue: 'invalid_number',
    })
  })

  it('rejects a length the brand does not issue', () => {
    expect(validateCardNumber('42424242424242424')).toMatchObject({
      ok: false,
      issue: 'invalid_number',
    })
  })

  it('separates "we do not take this card" from "this card is wrong"', () => {
    const result = validateCardNumber(NUMBERS.amex, { brands: ['visa', 'mastercard'] })

    expect(result).toMatchObject({ ok: false, issue: 'unsupported_brand', brand: 'amex' })
  })
})

describe('parseExpiry', () => {
  it('reads a two-digit year the way it is printed', () => {
    expect(parseExpiry('12 / 30', { now: NOW })).toMatchObject({ ok: true, month: 12, year: 2030 })
  })

  it('accepts four bare digits', () => {
    expect(parseExpiry('1230', { now: NOW })).toMatchObject({ ok: true, month: 12 })
  })

  it('treats the current month as still valid', () => {
    // A card works through the last day of the month printed on it.
    expect(parseExpiry('09 / 26', { now: NOW }).ok).toBe(true)
  })

  it('rejects last month', () => {
    expect(parseExpiry('08 / 26', { now: NOW })).toMatchObject({ ok: false, issue: 'expired' })
  })

  it('tells a bad month from a bad format', () => {
    expect(parseExpiry('13 / 30', { now: NOW })).toMatchObject({
      ok: false,
      issue: 'invalid_month',
    })
    expect(parseExpiry('1 / 30', { now: NOW })).toMatchObject({
      ok: false,
      issue: 'invalid_format',
    })
    expect(parseExpiry('', { now: NOW })).toMatchObject({ ok: false, issue: 'required' })
  })

  it('rejects a year too far out to be real', () => {
    expect(parseExpiry('12 / 99', { now: NOW })).toMatchObject({
      ok: false,
      issue: 'too_far_future',
    })
  })
})

describe('formatExpiry', () => {
  it('adds the separator once there is a month', () => {
    expect(formatExpiry('1')).toBe('1')
    expect(formatExpiry('12')).toBe('12')
    expect(formatExpiry('123')).toBe('12 / 3')
    expect(formatExpiry('1230')).toBe('12 / 30')
  })

  it('ignores anything past four digits', () => {
    expect(formatExpiry('12 / 3045')).toBe('12 / 30')
  })
})

describe('validateCvc', () => {
  it('wants three digits on most cards and four on Amex', () => {
    expect(validateCvc('123', 'visa').ok).toBe(true)
    expect(validateCvc('1234', 'amex').ok).toBe(true)
    expect(validateCvc('123', 'amex')).toMatchObject({ ok: false, issue: 'invalid_length' })
  })

  it('accepts either length before the brand is known', () => {
    expect(validateCvc('123').ok).toBe(true)
    expect(validateCvc('1234').ok).toBe(true)
  })

  it('calls an empty code required, not the wrong length', () => {
    expect(validateCvc('', 'visa')).toMatchObject({ ok: false, issue: 'required' })
  })

  it('says what length it wanted, so the message can too', () => {
    expect(validateCvc('12', 'amex')).toMatchObject({ expectedLengths: [4] })
  })
})

describe('validateCardholder', () => {
  it('accepts names as people write them', () => {
    expect(validateCardholder('Renée O.-Brien').ok).toBe(true)
    expect(validateCardholder('Ольга Иванова').ok).toBe(true)
    expect(validateCardholder("D'Angelo Smith Jr.").ok).toBe(true)
  })

  it('collapses stray whitespace instead of failing on it', () => {
    expect(validateCardholder('  Ada   Lovelace ')).toMatchObject({
      ok: true,
      value: 'Ada Lovelace',
    })
  })

  it('rejects an empty name and one that is not a name', () => {
    expect(validateCardholder('   ')).toMatchObject({ ok: false, issue: 'required' })
    expect(validateCardholder('A')).toMatchObject({ ok: false, issue: 'too_short' })
    expect(validateCardholder('4242424242424242')).toMatchObject({
      ok: false,
      issue: 'invalid_characters',
    })
  })
})

describe('lengths and display helpers', () => {
  it('knows how long a number may get, for the input maxlength', () => {
    expect(maxCardNumberLength('amex')).toBe(15)
    expect(maxCardNumberLength('visa')).toBe(19)
    expect(maxCardNumberLength()).toBe(19)
  })

  it('knows how long a security code is', () => {
    expect(cvcLengthsFor('amex')).toEqual([4])
    expect(cvcLengthsFor()).toEqual([3, 4])
  })

  it('shows only the last four', () => {
    expect(maskCardNumber('4242 4242 4242 4242')).toBe('•••• 4242')
    expect(last4('4242424242424242')).toBe('4242')
  })
})
