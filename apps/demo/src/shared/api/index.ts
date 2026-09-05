// The HTTP client itself lives in @pg/core/http - it knows nothing about payments and
// nothing about this app. What stays here is the one thing only the app can answer: where
// its API root is. Everything below imports the client through this facade, so the base
// URL is decided in exactly one place.

import { createHttpClient, type HttpClient } from '@pg/core/http'

export { HttpError } from '@pg/core/http'
export type { HttpClient, RequestOptions, ApiErrorPayload, HttpClientConfig } from '@pg/core/http'

/** The mock backend is served under the app's own base path, hence `BASE_URL`. */
export const createApiClient = (): HttpClient =>
  createHttpClient({ baseUrl: `${import.meta.env.BASE_URL}api` })
