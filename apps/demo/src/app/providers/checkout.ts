// Composition root for payments: the single place where the engine meets concrete
// plugins, a browser runtime and this app's own URLs.
//
// Everything the core deliberately refuses to guess is decided here - where the API lives,
// which origin the bank runs on, and what the absolute return URL is under this
// deployment's base path.

import { createCheckout, defineProvider, type CheckoutEngine, type Logger } from '@pg/core'
import { createBrowserRuntime } from '@pg/runtime-browser'
// Types only: importing them registers the provider's config with @pg/core's type system
// and is erased at build time, so the plugin's code still arrives through the import below.
import type { PspConfig } from '@pg/provider-psp'
import type { AcquiringConfig } from '@pg/provider-acquiring'
import type { HostedPageConfig } from '@pg/provider-hpp'
import type { HostedFieldsConfig } from '@pg/provider-hosted-fields'

const BASE_URL = import.meta.env.BASE_URL
const ACS_ORIGIN: string = import.meta.env.VITE_ACS_ORIGIN ?? 'https://localhost:5100'

const consoleLogger: Logger = {
  debug: (message, detail) => console.debug(`[checkout] ${message}`, detail ?? ''),
  warn: (message, detail) => console.warn(`[checkout] ${message}`, detail ?? ''),
  error: (message, detail) => console.error(`[checkout] ${message}`, detail ?? ''),
}

const pspConfig: PspConfig = {
  baseUrl: `${BASE_URL}api`,
  acsOrigin: ACS_ORIGIN,
}

// A different bank, a different protocol, and credentials that belong in a body rather
// than a header. None of that is visible past this object.
const acquiringConfig: AcquiringConfig = {
  baseUrl: `${BASE_URL}acquiring`,
  userName: 'demo-api',
  password: 'demo',
  acsOrigin: ACS_ORIGIN,
}

// No card ever reaches this app: the shopper types it on the bank's own site.
const hostedPageConfig: HostedPageConfig = {
  baseUrl: `${BASE_URL}api`,
  pageUrl: `${BASE_URL}hosted-page`,
}

// The card is typed inside the provider's frame. In production its origin is not ours;
// here it is, because a front-end-only mock cannot serve a second one.
const hostedFieldsConfig: HostedFieldsConfig = {
  baseUrl: `${BASE_URL}api`,
  fieldsUrl: `${BASE_URL}hosted-fields`,
  fieldsOrigin: window.location.origin,
}

// The return URL is built from BASE_URL, so it stays correct when the app is served from
// a sub-path. Hand-assembling it from `window.location.origin` is how that breaks.
const runtime = createBrowserRuntime({
  returnPath: `${BASE_URL}payment/return`,
  redirect: { frameTitle: () => '3-D Secure authentication' },
})

export const checkout: CheckoutEngine = createCheckout({
  providers: [
    defineProvider({
      id: 'psp',
      config: pspConfig,
      // A dynamic import, so the plugin is a chunk of its own and a second provider costs
      // this app nothing until someone picks it. Eager because this one is the default:
      // loading it at boot is what makes a missing runner a startup error rather than a
      // surprise halfway through a payment.
      load: () => import('@pg/provider-psp'),
      eager: true,
    }),
    defineProvider({
      id: 'acquiring',
      config: acquiringConfig,
      // Lazy: a shopper who never switches never downloads it.
      load: () => import('@pg/provider-acquiring'),
    }),
    defineProvider({
      id: 'hpp',
      config: hostedPageConfig,
      load: () => import('@pg/provider-hpp'),
    }),
    defineProvider({
      id: 'hostedfields',
      config: hostedFieldsConfig,
      load: () => import('@pg/provider-hosted-fields'),
    }),
  ],
  defaultProviderId: 'psp',
  runners: runtime.runners,
  storage: runtime.storage,
  returnUrl: runtime.returnUrl,
  log: import.meta.env.DEV ? consoleLogger : undefined,
})
