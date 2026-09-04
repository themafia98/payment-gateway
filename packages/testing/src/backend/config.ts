export const LATENCY = { min: 150, max: 700 }

export const OTP_SUCCESS = '1234'

/**
 * How long a `processing` payment takes to settle.
 *
 * Real asynchronous authorizations take seconds to days; what matters for the checkout is
 * only that the answer arrives later and has to be asked for, so this is short enough to
 * watch happen.
 */
export const PROCESSING_SETTLE_MS = 1200
