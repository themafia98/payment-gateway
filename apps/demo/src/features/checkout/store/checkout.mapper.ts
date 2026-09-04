import type { PaymentResult } from '@/entities/payment'
import type { CheckoutState } from './checkout.types'

type CheckoutResultState = Omit<CheckoutState, 'method'>

type ResultOf<S extends PaymentResult['status']> = Extract<PaymentResult, { status: S }>

type ResultHandlers = {
  [S in PaymentResult['status']]: (result: ResultOf<S>) => CheckoutResultState
}

const resultHandlers: ResultHandlers = {
  succeeded: (r) => ({ status: 'succeeded', intent: r.intent, action: null, error: null }),
  requires_action: (r) => ({
    status: 'requires_action',
    intent: r.intent,
    action: r.action,
    error: null,
  }),
  processing: (r) => ({ status: 'processing', intent: r.intent, action: null, error: null }),
  declined: (r) => ({ status: 'declined', intent: r.intent, action: null, error: r.error }),
  error: (r) => ({ status: 'error', intent: null, action: null, error: r.error }),
}

export const resultToState = (result: PaymentResult): CheckoutResultState =>
  (resultHandlers[result.status] as (r: PaymentResult) => CheckoutResultState)(result)
