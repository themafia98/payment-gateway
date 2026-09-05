import type { ApiError } from '../types'

export const normalizeCardNumber = (value: string): string => value.replace(/\D/g, '')

export const missingParam = (param: string): ApiError => ({
  type: 'invalid_request_error',
  code: 'parameter_missing',
  message: `Missing required param: ${param}.`,
  param,
})

export const invalidParam = (param: string, message: string): ApiError => ({
  type: 'invalid_request_error',
  code: 'parameter_invalid',
  message,
  param,
})

export const readJson = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}
