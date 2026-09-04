/**
 * The providers the demo registers.
 *
 * Duplicated rather than imported: the source of truth is
 * `apps/demo/src/app/providers/checkout.ts`, and the labels are in
 * `features/select-payment-provider`. Keeping the specs free of app imports is what lets
 * the same suite describe a checkout whose internals it knows nothing about.
 */
export const PROVIDERS = {
  psp: 'Card processor',
  acquiring: 'Acquiring bank',
} as const

export type ProviderId = keyof typeof PROVIDERS
