// Composition root for payments: where the engine meets the plugins, the browser runtime
// and this app's own URLs.

import {
  createCheckout,
  defineProvider,
  type CheckoutEngine,
  type Logger,
} from '@checkout-kit/core'
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
// Type imports only: they register the plugin's config with @checkout-kit/core and are erased at
// build time, so the code still arrives through the dynamic import below.
import type { PspConfig } from '@checkout-kit/provider-psp'
import type { AcquiringConfig } from '@checkout-kit/provider-acquiring'
import type { HostedPageConfig } from '@checkout-kit/provider-hpp'
import type { HostedFieldsConfig } from '@checkout-kit/provider-hosted-fields'
import type { WalletConfig } from '@checkout-kit/provider-wallet'
import type { BankTransferConfig } from '@checkout-kit/provider-bank-transfer'

interface WalletSheetParams {
  merchantName: string
  amount: number
  currency: string
}

interface DemoWallet {
  show(params: WalletSheetParams): Promise<{ walletToken: string }>
}

const BASE_URL = import.meta.env.BASE_URL
const ACS_ORIGIN: string = import.meta.env.VITE_ACS_ORIGIN ?? 'https://localhost:5100'

// Anything long enough to be a card number is masked before it reaches the console. The
// engine logs the cause of a provider failure, and a cause can carry the request that
// caused it.
const PAN = /\b\d{12,19}\b/g

const redact = (detail: unknown): unknown => {
  if (detail === undefined) return ''
  try {
    return JSON.parse(
      JSON.stringify(detail, (_key, value) =>
        typeof value === 'string' ? value.replace(PAN, '[redacted]') : value,
      ) ?? '""',
    )
  } catch {
    return '[unserializable]'
  }
}

const consoleLogger: Logger = {
  debug: (message, detail) => console.debug(`[checkout] ${message}`, redact(detail)),
  warn: (message, detail) => console.warn(`[checkout] ${message}`, redact(detail)),
  error: (message, detail) => console.error(`[checkout] ${message}`, redact(detail)),
}

const pspConfig: PspConfig = {
  baseUrl: `${BASE_URL}api`,
  acsOrigin: ACS_ORIGIN,
}

// A different bank, a different protocol. None of it is visible past this object.
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

// The card is typed inside the provider's frame. In production that frame is on another
// origin; here it is not, because a front-end-only mock cannot serve a second one.
const hostedFieldsConfig: HostedFieldsConfig = {
  baseUrl: `${BASE_URL}api`,
  fieldsUrl: `${BASE_URL}hosted-fields`,
  fieldsOrigin: window.location.origin,
}

// Someone else's script, someone else's sheet. The checkout only asks for a payload.
const walletConfig: WalletConfig = {
  baseUrl: `${BASE_URL}api`,
  sdk: 'demo-wallet',
  scriptUrl: `${BASE_URL}wallet-sdk.js`,
  merchantName: 'Demo Store',
}

// No card, no redirect, no frame: a code on the screen and a shopper paying it in their
// banking app. The checkout finds out by asking, which is what `poll` means below.
const transferConfig: BankTransferConfig = {
  baseUrl: `${BASE_URL}api`,
  format: 'qr',
  instructions: 'Scan this with your banking app, or copy the code into it.',
  poll: { intervalMs: 1500, timeoutMs: 10 * 60 * 1000 },
}

// Built from BASE_URL, so it stays right when the app is served from a sub-path.
const runtime = createBrowserRuntime({
  returnPath: `${BASE_URL}payment/return`,
  redirect: { frameTitle: () => '3-D Secure authentication' },
  collectFields: { frameTitle: () => 'Card details' },
  // How to drive the wallet once its script loads. The runner knows nothing about this
  // SDK - this adapter is the whole coupling, and it lives in the app.
  sdk: {
    adapters: [
      {
        sdk: 'demo-wallet',
        request: async (params) => {
          const wallet = (window as unknown as { DemoWallet?: DemoWallet }).DemoWallet
          if (!wallet) throw new Error('The wallet SDK did not register itself.')
          return await wallet.show(params as unknown as WalletSheetParams)
        },
      },
    ],
  },
})

export const checkout: CheckoutEngine = createCheckout({
  providers: [
    defineProvider({
      id: 'psp',
      config: pspConfig,
      // A dynamic import, so each plugin is its own chunk. Eager because this one is the
      // default: loading it at boot turns a missing runner into a startup error.
      load: () => import('@checkout-kit/provider-psp'),
      eager: true,
    }),
    defineProvider({
      id: 'acquiring',
      config: acquiringConfig,
      // Lazy: a shopper who never switches never downloads it.
      load: () => import('@checkout-kit/provider-acquiring'),
    }),
    defineProvider({
      id: 'hpp',
      config: hostedPageConfig,
      load: () => import('@checkout-kit/provider-hpp'),
    }),
    defineProvider({
      id: 'hostedfields',
      config: hostedFieldsConfig,
      load: () => import('@checkout-kit/provider-hosted-fields'),
    }),
    defineProvider({
      id: 'wallet',
      config: walletConfig,
      load: () => import('@checkout-kit/provider-wallet'),
    }),
    defineProvider({
      id: 'transfer',
      config: transferConfig,
      load: () => import('@checkout-kit/provider-bank-transfer'),
    }),
  ],
  defaultProviderId: 'psp',
  runners: runtime.runners,
  storage: runtime.storage,
  returnUrl: runtime.returnUrl,
  log: import.meta.env.DEV ? consoleLogger : undefined,
})
