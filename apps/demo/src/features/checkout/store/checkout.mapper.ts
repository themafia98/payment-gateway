import type { PaymentResult } from '@/entities/payment'
import type { CheckoutState } from './checkout.types'

type CheckoutResultState = Omit<CheckoutState, 'method'>

type ResultOf<S extends PaymentResult['status']> = Extract<PaymentResult, { status: S }>

type ResultHandlers = {
  [S in PaymentResult['status']]: (result: ResultOf<S>) => CheckoutResultState
}

const resultHandlers: ResultHandlers = {
  succeeded: (r) => ({ status: 'succeeded', intent: r.intent, challenge: null, error: null }),
  requires_action: (r) => ({
    status: 'requires_action',
    intent: r.intent,
    challenge: r.challenge,
    error: null,
  }),
  declined: (r) => ({ status: 'declined', intent: r.intent, challenge: null, error: r.error }),
  error: (r) => ({ status: 'error', intent: null, challenge: null, error: r.error }),
}

export const resultToState = (result: PaymentResult): CheckoutResultState =>
  (resultHandlers[result.status] as (r: PaymentResult) => CheckoutResultState)(result)
