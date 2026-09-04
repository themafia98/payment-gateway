/**
 * The providers the demo registers, and the one thing a spec needs to know about them.
 *
 * Duplicated rather than imported: the source of truth is
 * `apps/demo/src/app/providers/checkout.ts` and the plugins' own capabilities. Keeping the
 * specs free of app imports is what lets the same suite describe a checkout whose
 * internals it knows nothing about.
 */
export const PROVIDERS = {
  psp: { label: 'Card processor', collectsCard: true },
  acquiring: { label: 'Acquiring bank', collectsCard: true },
  hpp: { label: 'Bank page', collectsCard: false },
} as const

export type ProviderId = keyof typeof PROVIDERS
