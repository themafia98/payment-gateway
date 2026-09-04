import type {
  MerchantConfig,
  PaymentIntent,
  PaymentMethod,
  PlanRecord,
  ThreeDSChallenge,
} from './types'

export const merchantConfig: MerchantConfig = {
  id: 'merchant_demo',
  name: 'Demo Store',
  currency: 'USD',
  amount: 4999,
}

export const paymentMethods: PaymentMethod[] = [
  {
    id: 'card_visa',
    brand: 'Visa',
    label: 'Visa test card',
    last4: '4242',
  },
  {
    id: 'card_mastercard',
    brand: 'Mastercard',
    label: 'Mastercard test card',
    last4: '4444',
  },
]

export const plans: PlanRecord[] = [
  { id: '1id', name: 'Monthly', price: '25/month', amount: 2500, currency: 'USD' },
  { id: '2id', name: 'Yearly', discount: '32%', price: '125/year', amount: 12500, currency: 'USD' },
]

export const plansById: Map<string, PlanRecord> = new Map(plans.map((plan) => [plan.id, plan]))

// Payments live in memory, and a full-page redirect to a bank throws that memory away.
// A real backend does not forget while the shopper is off authenticating, so this one
// keeps its state in sessionStorage: same lifetime as the tab, restored on reload.
//
// Without it, no redirect-based integration could be exercised at all - the payment would
// come back to a backend that had never heard of it.
const STORAGE_KEY = 'pg:mock-backend'

interface Persisted {
  paymentIntents: [string, PaymentIntent][]
  idempotencyKeys: [string, string][]
  threeDSChallenges: [string, ThreeDSChallenge][]
  processingSettlesAt: [string, number][]
  tokenizedCards: [string, string][]
}

const readPersisted = (): Partial<Persisted> => {
  try {
    return JSON.parse(globalThis.sessionStorage?.getItem(STORAGE_KEY) ?? '{}') as Partial<Persisted>
  } catch {
    // No storage (Node tests), or somebody else's data under our key.
    return {}
  }
}

const restored = readPersisted()

export const paymentIntents: Map<string, PaymentIntent> = new Map(restored.paymentIntents ?? [])

export const idempotencyKeys: Map<string, string> = new Map(restored.idempotencyKeys ?? [])

export const threeDSChallenges: Map<string, ThreeDSChallenge> = new Map(
  restored.threeDSChallenges ?? [],
)

/**
 * When a `processing` intent becomes final. The browser learns about it by asking again -
 * there is no webhook here, and there is no push either.
 */
export const processingSettlesAt: Map<string, number> = new Map(restored.processingSettlesAt ?? [])

/**
 * token -> card, for the hosted-fields integration. It lives with the rest of the backend
 * state and not in that handler, because a field frame is a *separate browsing context*:
 * it tokenizes from its own copy of this module, and the checkout charges from another.
 * Two stores would mean the token issued in the frame was unknown to the shop.
 */
export const tokenizedCards: Map<string, string> = new Map(restored.tokenizedCards ?? [])

/** Write the whole backend down. Cheap enough at this size to do after every change. */
export const persistBackend = (): void => {
  try {
    globalThis.sessionStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify({
        paymentIntents: [...paymentIntents],
        idempotencyKeys: [...idempotencyKeys],
        threeDSChallenges: [...threeDSChallenges],
        processingSettlesAt: [...processingSettlesAt],
        tokenizedCards: [...tokenizedCards],
      } satisfies Persisted),
    )
  } catch {
    // Storage is unavailable or full; the mock still works for anything that stays on one
    // page, which is every flow except a redirect.
  }
}

/**
 * The one place an intent is written. Every facade goes through it, which is what keeps
 * them describing the same payment rather than three of their own.
 */
export const saveIntent = (intent: PaymentIntent): PaymentIntent => {
  paymentIntents.set(intent.id, intent)
  persistBackend()
  return intent
}

export const rememberIdempotencyKey = (key: string, intentId: string): void => {
  idempotencyKeys.set(key, intentId)
  persistBackend()
}

export const scheduleSettlement = (intentId: string, at: number): void => {
  processingSettlesAt.set(intentId, at)
  persistBackend()
}

export const rememberToken = (token: string, cardNumber: string): void => {
  tokenizedCards.set(token, cardNumber)
  persistBackend()
}

export const consumeToken = (token: string): string | undefined => {
  // Read through to storage first. The token was minted in the field frame - a separate
  // browsing context with its own copy of this module - so the map here has not seen it.
  for (const [minted, card] of readPersisted().tokenizedCards ?? []) {
    if (!tokenizedCards.has(minted)) tokenizedCards.set(minted, card)
  }

  const cardNumber = tokenizedCards.get(token)
  // Single use, like the real thing.
  tokenizedCards.delete(token)
  persistBackend()
  return cardNumber
}

export const clearSettlement = (intentId: string): void => {
  processingSettlesAt.delete(intentId)
  persistBackend()
}

/**
 * Wipes the in-memory backend. The browser gets a fresh one on every reload; a test run
 * does not, so each case has to ask for one.
 */
export const resetBackend = (): void => {
  paymentIntents.clear()
  idempotencyKeys.clear()
  threeDSChallenges.clear()
  processingSettlesAt.clear()
  tokenizedCards.clear()
  persistBackend()
}
