import { HttpResponse } from 'msw'
import type { ApiError } from '../types'

export const json = (data: unknown, init?: ResponseInit): Response =>
  HttpResponse.json(data as Parameters<typeof HttpResponse.json>[0], init)

export const error = (status: number, err: ApiError): Response =>
  HttpResponse.json({ error: err }, { status })

export const notFound = (resource: string, param = 'id'): Response =>
  error(404, {
    type: 'invalid_request_error',
    code: 'resource_missing',
    message: `No such ${resource}.`,
    param,
  })

export const invalidJson = (): Response =>
  error(400, { type: 'invalid_request_error', message: 'Request body is not valid JSON.' })

/** Charging an already-settled payment again would take the money twice. */
export const alreadySettled = (resource: string): Response =>
  error(409, {
    type: 'invalid_request_error',
    code: 'payment_already_settled',
    message: `This ${resource} has already been completed.`,
  })
