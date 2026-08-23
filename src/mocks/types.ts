export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'declined'
  | 'canceled'

export type PaymentMethod = {
  id: string
  brand: string
  label: string
  last4: string
}

export type MerchantConfig = {
  id: string
  name: string
  currency: string
  amount: number
}

export type ApiErrorType = 'invalid_request_error' | 'card_error' | 'api_error' | 'rate_limit_error'

export type ApiError = {
  type: ApiErrorType
  code?: string
  message: string
  param?: string
}

export type ApiErrorResponse = {
  error: ApiError
}

export type ThreeDSecureAction = {
  challengeId: string
  url: string
  status: 'pending' | 'succeeded' | 'failed'
}

export type NextAction = {
  type: 'redirect_to_url'
  three_d_secure: ThreeDSecureAction
}

export type PaymentIntent = {
  id: string
  object: 'payment_intent'
  amount: number
  currency: string
  status: PaymentIntentStatus
  clientSecret: string
  livemode: boolean
  created: number
  nextAction?: NextAction | null
  error?: ApiError | null
}

export type ThreeDSChallenge = {
  id: string
  paymentIntentId: string
  outcome: 'pass' | 'fail'
  status: 'pending' | 'succeeded' | 'failed'
  createdAt: string
}

export type CreatePaymentIntentRequest = {
  planId: string
}

export type PlanRecord = {
  id: string
  name: string
  discount?: string
  price: string
  amount: number
  currency: string
}

export type ConfirmPaymentIntentRequest = {
  cardNumber: string
}

export type CompleteChallengeRequest = {
  otp?: string
  outcome?: 'success' | 'fail'
}
