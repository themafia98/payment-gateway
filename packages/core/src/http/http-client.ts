// A thin fetch wrapper: base URL, body encoding, headers, status codes - nothing about
// payments. Response-to-domain mapping belongs to the plugins.
//
// Two things are configurable because real integrations differ on exactly these points:
// `encoding`, since bank host-to-host APIs speak form-urlencoded rather than JSON, and
// `parseError`, since not everyone reports failures the same way (some put a business
// error code inside an HTTP 200). Everything else is deliberately fixed.

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

export interface HttpClientConfig {
  /**
   * Required on purpose. The core must not know how the host computes its API root, so
   * there is no `import.meta.env` fallback hiding in here.
   */
  baseUrl: string
  /** Defaults sent with every request; a per-request header of the same name wins. */
  headers?: Record<string, string>
  encoding?: 'json' | 'form'
  /** Turn a failed response into an error payload. Defaults to the `{ error: {...} }` envelope. */
  parseError?: (response: Response, payload: unknown) => ApiErrorPayload
  /** Injectable for tests; defaults to the platform `fetch`. */
  fetch?: typeof fetch
}

interface BodyEncoder {
  contentType: string
  encode(body: unknown): string
}

const encoders: Record<'json' | 'form', BodyEncoder> = {
  json: {
    contentType: 'application/json',
    encode: (body) => JSON.stringify(body),
  },
  form: {
    contentType: 'application/x-www-form-urlencoded',
    encode: (body) => new URLSearchParams(body as Record<string, string>).toString(),
  },
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

const defaultParseError = (response: Response, payload: unknown): ApiErrorPayload =>
  isErrorEnvelope(payload)
    ? payload.error
    : { type: 'api_error', message: `Request failed with status ${response.status}` }

export const createHttpClient = (config: HttpClientConfig): HttpClient => {
  const {
    baseUrl,
    headers: defaultHeaders,
    encoding = 'json',
    parseError = defaultParseError,
  } = config
  const doFetch = config.fetch ?? fetch
  const encoder = encoders[encoding]

  /** Read a failed response's body and turn it into an HttpError (shared by all verbs). */
  const toHttpError = async (response: Response): Promise<HttpError> =>
    new HttpError(response.status, parseError(response, await parseBody(response)))

  // One place that talks to fetch; wraps network-level failures as HttpError(0).
  const rawFetch = async (
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<Response> => {
    const hasBody = body !== undefined
    try {
      return await doFetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(hasBody ? { 'Content-Type': encoder.contentType } : {}),
          ...defaultHeaders,
          ...options.headers,
        },
        body: hasBody ? encoder.encode(body) : undefined,
        signal: options.signal,
      })
    } catch (cause) {
      // fetch rejects only on network-level failures (offline, DNS, CORS...).
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
