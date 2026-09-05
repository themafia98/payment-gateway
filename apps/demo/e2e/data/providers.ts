/**
 * The providers the demo registers, and the one thing a spec needs to know about them:
 * where the card gets typed.
 *
 * Duplicated rather than imported - the source of truth is
 * `apps/demo/src/app/providers/checkout.ts` and the plugins' own capabilities. Keeping the
 * specs free of app imports is what lets the same suite describe a checkout whose
 * internals it knows nothing about.
 */
export const PROVIDERS = {
  psp: { label: 'Card processor', flow: 'card' },
  acquiring: { label: 'Acquiring bank', flow: 'card' },
  hpp: { label: 'Bank page', flow: 'hosted-page' },
  hostedfields: { label: 'Hosted fields', flow: 'hosted-fields' },
  wallet: { label: 'Wallet', flow: 'wallet' },
} as const

export type ProviderId = keyof typeof PROVIDERS

export type PaymentFlow = (typeof PROVIDERS)[ProviderId]['flow']
