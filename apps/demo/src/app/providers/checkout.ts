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

// The return URL is built from BASE_URL, so it stays correct when the app is served from
// a sub-path. Hand-assembling it from `window.location.origin` is how that breaks.
const runtime = createBrowserRuntime({
  returnPath: `${BASE_URL}3ds/return`,
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
  ],
  defaultProviderId: 'psp',
  runners: runtime.runners,
  storage: runtime.storage,
  returnUrl: runtime.returnUrl,
  log: import.meta.env.DEV ? consoleLogger : undefined,
})
