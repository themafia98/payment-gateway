export const ROUTES = {
  checkout: '/',
  success: '/summary/success',
  failure: '/summary/failure',
} as const

export const URL_PATTERNS = {
  success: /\/summary\/success/,
  failure: /\/summary\/failure/,
  summary: /\/summary/,
  paymentAction: /\/payment\/action\//,
} as const
