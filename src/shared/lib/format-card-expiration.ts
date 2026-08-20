import { Temporal } from '@js-temporal/polyfill'
import type { CardExpiration } from '../types/credit-card.ts'

export const isCardExpiration = (value: string): value is CardExpiration => {
  const [month, year] = value.split(' / ')

  if (!month || !year || month.length !== 2 || year.length !== 4) {
    return false
  }

  const monthNumber = Number(month)
  const yearNumber = Number(year)

  if (
    !Number.isInteger(monthNumber) ||
    !Number.isInteger(yearNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return false
  }

  try {
    const expiration = Temporal.PlainYearMonth.from({
      year: yearNumber,
      month: monthNumber,
    })

    const now = Temporal.Now.plainDateISO()

    const currentMonth = Temporal.PlainYearMonth.from({
      year: now.year,
      month: now.month,
    })

    return Temporal.PlainYearMonth.compare(expiration, currentMonth) >= 0
  } catch {
    return false
  }
}

export const formatCardExpiration = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 6)

  if (digits.length <= 2) {
    return digits
  }

  const month = digits.slice(0, 2)
  const year = digits.slice(2)

  return `${month} / ${year}`
}
