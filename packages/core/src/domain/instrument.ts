// What the shopper is paying with. This union is the reason one contract covers raw-card
// host-to-host, tokenized hosted fields, wallets and hosted payment pages alike: a
// provider that never sees card data simply accepts `{ kind: 'none' }`.

import type { CardExpiration, CardNumber, CvcCode } from './brand'

export type PaymentInstrumentKind = 'card' | 'token' | 'hosted_session' | 'wallet' | 'none'

export type PaymentInstrument =
  | { kind: 'card'; number: CardNumber; exp: CardExpiration; cvc: CvcCode; holder?: string }
  | { kind: 'token'; token: string; scheme?: string; last4?: string }
  /** Card data was collected by the provider's own iframe; all we hold is its session id. */
  | { kind: 'hosted_session'; sessionId: string }
  | { kind: 'wallet'; walletId: string; payload: unknown }
  /** Nothing collected on our side - the provider will ask for it on its own page. */
  | { kind: 'none' }
