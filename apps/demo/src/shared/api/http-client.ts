// Thin fetch wrapper: base URL, JSON, headers, status codes — nothing about payments.
// Response->domain mapping stays in the adapters. Error shape matches the mock backend
// (src/mocks/lib/respond.ts): { error: { type, code?, message, param? } }.

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
  /** Fetch a binary payload (e.g. a PDF receipt). Same error contract as get/post. */
  getBlob(path: string, options?: RequestOptions): Promise<Blob>
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

/** Read a failed response's body and turn it into an HttpError (shared by all verbs). */
const toHttpError = async (response: Response): Promise<HttpError> => {
  const payload = await parseBody(response)
  const error: ApiErrorPayload = isErrorEnvelope(payload)
    ? payload.error
    : { type: 'api_error', message: `Request failed with status ${response.status}` }
  return new HttpError(response.status, error)
}

export const createHttpClient = (baseUrl = `${import.meta.env.BASE_URL}api`): HttpClient => {
  // One place that talks to fetch; wraps network-level failures as HttpError(0).
  const rawFetch = async (
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<Response> => {
    const hasBody = body !== undefined
    try {
      return await fetch(`${baseUrl}${path}`, {
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
  }

  const request = async <T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> => {
    const response = await rawFetch(method, path, body, options)
    if (!response.ok) throw await toHttpError(response)
    return (await parseBody(response)) as T
  }

  return {
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, body, options) => request('POST', path, body, options),
    getBlob: async (path, options) => {
      const response = await rawFetch('GET', path, undefined, options)
      if (!response.ok) throw await toHttpError(response)
      return response.blob()
    },
  }
}
