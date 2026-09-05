import type { CvcCode } from '../types/credit-card'
import { createBranded } from './branded'

export const normalizeCVC = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 3)
}

export const isCVC = (value: string): value is CvcCode => {
  return /^\d{3}$/.test(value)
}

export const toCVC = (value: string): CvcCode => {
  if (!isCVC(value)) {
    throw new Error('Invalid CVC')
  }

  return createBranded<string, 'CvcCode'>(value)
}
