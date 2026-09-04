import type { PaymentGateway, PaymentResult } from '@/entities/payment'

// 3-D Secure use-case: settle a challenge and return the result. Thin today, but
// it's the seam the UI/routes go through instead of calling the gateway directly.
export const createAuthenticate3ds =
  (gateway: PaymentGateway) =>
  (challengeId: string, outcome: 'success' | 'fail'): Promise<PaymentResult> =>
    gateway.authenticate(challengeId, outcome)
