import { HttpResponse } from 'msw'
import type { ApiError } from '../types'

export const json = (data: unknown, init?: ResponseInit) =>
  HttpResponse.json(data as Parameters<typeof HttpResponse.json>[0], init)

export const error = (status: number, err: ApiError) =>
  HttpResponse.json({ error: err }, { status })

export const notFound = (resource: string, param = 'id') =>
  error(404, {
    type: 'invalid_request_error',
    code: 'resource_missing',
    message: `No such ${resource}.`,
    param,
  })

export const invalidJson = () =>
  error(400, { type: 'invalid_request_error', message: 'Request body is not valid JSON.' })
