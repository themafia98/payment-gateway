/**
 * LAYER: shared infrastructure (transport).
 *
 * A thin wrapper over `fetch`. It knows ONLY about HTTP — base URL, JSON
 * (de)serialization, headers, status codes. It knows NOTHING about payments.
 * Mapping of a response into a domain type stays in the adapter that uses this
 * client, not here.
 *
 * Error contract matches the mock backend (`src/mocks/lib/respond.ts`): failed
 * responses have shape `{ error: { type, code?, message, param? } }`.
 */

export interface ApiErrorPayload {
  type: string
  code?: string
  message: string
  param?: string
}

/** Thrown for any non-2xx response or a network failure (`status === 0`). */
export class HttpError extends Error {
  readonly status: number
  readonly payload: ApiErrorPayload

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message)
    this.name = 'HttpError'
    this.status = status
    this.payload = payload
  }
}

export interface RequestOptions {
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface HttpClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>
}

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const isErrorEnvelope = (value: unknown): value is { error: ApiErrorPayload } =>
  typeof value === 'object' &&
  value !== null &&
  'error' in value &&
  typeof (value as { error: unknown }).error === 'object' &&
  (value as { error: unknown }).error !== null

export const createHttpClient = (baseUrl = '/api'): HttpClient => {
  const request = async <T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> => {
    const hasBody = body !== undefined

    let response: Response
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers,
        },
        body: hasBody ? JSON.stringify(body) : undefined,
        signal: options.signal,
      })
    } catch (cause) {
      // fetch rejects only on network-level failures (offline, DNS, CORS…).
      throw new HttpError(0, {
        type: 'network_error',
        message: cause instanceof Error ? cause.message : 'Network request failed',
      })
    }

    const payload = await parseBody(response)

    if (!response.ok) {
      const error: ApiErrorPayload = isErrorEnvelope(payload)
        ? payload.error
        : { type: 'api_error', message: `Request failed with status ${response.status}` }
      throw new HttpError(response.status, error)
    }

    return payload as T
  }

  return {
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, body, options) => request('POST', path, body, options),
  }
}
