/**
 * Public API of the `payment` entity (the slice's public API in FSD).
 *
 * The payment vocabulary itself now lives in @pg/core, where the plugins that speak it
 * live too. This slice stays as the app's facade over it: everything below imports from
 * `@/entities/payment`, and the fact that the types come from a package is not their
 * concern.
 */
export type {
  PaymentStatus,
  PaymentError,
  PaymentIntent,
  PaymentResult,
  PaymentAction,
  ActionEvidence,
} from '@pg/core'
