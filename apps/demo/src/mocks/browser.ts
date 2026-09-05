// The handlers themselves live in @checkout-kit/testing, so the same fake backend serves this
// worker and Node tests. What stays here is browser-only wiring.

import { setupWorker } from 'msw/browser'
import { handlers } from '@checkout-kit/testing/backend'

export const worker = setupWorker(...handlers)
