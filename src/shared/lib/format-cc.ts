import { createBranded } from './branded.ts'
import type { CardNumber } from '../types/credit-card.ts'

export const toCardNumber = (value: string): CardNumber => {
  const normalized = normalizeCardNumber(value)

  if (!isCardNumber(normalized)) {
    throw new Error('Invalid card number')
  }

  return createBranded<string, 'CardNumber'>(normalized)
}

export const normalizeCardNumber = (value: CardNumber | string) => {
  return value.replace(/\D/g, '')
}

export const formatCardNumber = (value: string): string => {
  return normalizeCardNumber(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

export const isCardNumber = (value: string): value is CardNumber => {
  const normalized = normalizeCardNumber(value)

  return normalized.length >= 12 && normalized.length <= 19
}
