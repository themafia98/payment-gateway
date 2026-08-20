# Mock payment API

A browser-side mock of a Stripe-style payment API, built on [MSW](https://mswjs.io/).
It lets the frontend develop and test the full payment flow — including 3‑D Secure — without a
real backend. Requests are intercepted by a service worker, so from the app's point of view these
are ordinary `fetch` calls over the network.

## Enabling it

The mock only runs in development, and only when explicitly turned on:

```bash
npm run dev:mock
```

This starts Vite with the `mock` mode, which loads `.env.mock` (`VITE_ENABLE_MSW=true`).
The worker is registered in `src/app/enable-mocking.ts`; when the flag is off (plain `npm run dev`
or any production build) none of this code is bundled and requests hit the real network.

Unhandled requests are passed through (`onUnhandledRequest: 'bypass'`), so static assets and other
traffic are unaffected.

## Conventions

- **Base path:** all endpoints live under `/api`.
- **Format:** requests and responses are JSON unless noted (the 3‑D Secure challenge page is HTML).
- **Amounts:** integer **minor units** (e.g. cents). `4999` means `$49.99`.
- **No auth:** requests do not require an API key.
- **Errors** use a single envelope:

  ```json
  {
    "error": {
      "type": "invalid_request_error",
      "code": "parameter_missing",
      "message": "…",
      "param": "amount"
    }
  }
  ```

  `type` is one of `invalid_request_error`, `card_error`, `api_error`, `rate_limit_error`.
  `code` and `param` are present where relevant.

- **Latency:** every response is delayed by a random 150–700 ms to mimic a real network.

### Payment intent object

```jsonc
{
  "id": "pi_a1b2…",
  "object": "payment_intent",
  "amount": 4999,
  "currency": "USD",
  "status": "requires_payment_method",
  "clientSecret": "pi_a1b2…_secret_…",
  "livemode": false,
  "created": 1755705600, // unix seconds
  "nextAction": null, // set when status is "requires_action"
  "error": null, // set when a card is declined
}
```

`status` moves through: `requires_payment_method` → `processing` | `requires_action` |
`succeeded` | `declined`, and `canceled` via the cancel endpoint. `succeeded`, `declined` and
`canceled` are terminal.

## Endpoints

### Merchant & payment methods

| Method | Path                   | Description                      |
| ------ | ---------------------- | -------------------------------- |
| GET    | `/api/merchant/config` | Merchant name, currency, amount. |
| GET    | `/api/payment-methods` | Saved test payment methods.      |

### Payment intents

| Method | Path                               | Description                           |
| ------ | ---------------------------------- | ------------------------------------- |
| POST   | `/api/payment-intents`             | Create an intent.                     |
| GET    | `/api/payment-intents/:id`         | Retrieve an intent (poll its status). |
| POST   | `/api/payment-intents/:id/confirm` | Confirm with a card number.           |
| POST   | `/api/payment-intents/:id/cancel`  | Cancel a non-terminal intent.         |

**Create** — body `{ amount, currency }`. Returns `201` with the intent.

```ts
const res = await fetch('/api/payment-intents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
  body: JSON.stringify({ amount: 4999, currency: 'USD' }),
})
const intent = await res.json()
```

Validation: missing `amount`/`currency` → `400` (`parameter_missing`); non-positive or non-integer
`amount`, or a `currency` that isn't a 3‑letter code → `422` (`parameter_invalid`).

**Idempotency** — pass an `Idempotency-Key` header on create. Repeating the same key returns the
original intent instead of creating a new one, so a retried request is safe.

**Confirm** — body `{ cardNumber }` (spaces are ignored). The card number decides the outcome
(see the table below). The response is `200` with the updated intent:

- succeeds → `status: "succeeded"`
- declines → `status: "declined"` with a populated `error` object (still HTTP `200`; the decline is
  a card result, not a transport error)
- needs authentication → `status: "requires_action"` with a `nextAction` (see 3‑D Secure)
- processing → `status: "processing"` (poll `GET /api/payment-intents/:id` for the final state)

Confirming an intent that is already terminal or awaiting authentication returns `400`
(`payment_intent_unexpected_state`). A confirm against an unknown id returns `404`
(`resource_missing`).

**Cancel** — moves a non-terminal intent to `canceled`; a terminal intent returns `400`.

### 3‑D Secure

| Method | Path                                       | Description                            |
| ------ | ------------------------------------------ | -------------------------------------- |
| GET    | `/api/3ds/challenge/:challengeId`          | Challenge page (HTML) or state (JSON). |
| POST   | `/api/3ds/challenge/:challengeId/complete` | Submit the authentication result.      |

When a confirm returns `requires_action`, the intent carries:

```jsonc
"nextAction": {
  "type": "redirect_to_url",
  "three_d_secure": {
    "challengeId": "tdsc_…",
    "url": "/api/3ds/challenge/tdsc_…",
    "status": "pending"
  }
}
```

`GET /api/3ds/challenge/:challengeId` returns an HTML authentication screen by default (suitable for
a redirect or iframe). Send `Accept: application/json` to get the challenge state as JSON instead.

`POST /api/3ds/challenge/:challengeId/complete` accepts either the HTML form field `otp`, a JSON
body `{ "otp": "1234" }`, or `{ "outcome": "success" | "fail" }`. The test OTP is `1234`.
Whether authentication actually succeeds is fixed by the card used (a "3DS passes" card can still
fail on a wrong OTP; a "3DS fails" card always fails). On completion the linked intent becomes
`succeeded` or `declined` (`authentication_failed`). A JSON request receives
`{ challenge, paymentIntent }`; an HTML form submit receives a small result page.

## Test cards

Behaviour is keyed on the digits of the card number.

| Card number           | Result                                                   |
| --------------------- | -------------------------------------------------------- |
| `4242 4242 4242 4242` | Succeeds.                                                |
| `4000 0000 0000 0002` | Declined — `generic_decline`.                            |
| `4000 0000 0000 9995` | Declined — `insufficient_funds`.                         |
| `4000 0000 0000 0069` | Declined — `expired_card`.                               |
| `4000 0000 0000 0127` | Declined — `incorrect_cvc`.                              |
| `4000 0025 0000 3155` | Requires 3‑D Secure; passes when completed (OTP `1234`). |
| `4000 0084 0000 1629` | Requires 3‑D Secure; always fails.                       |
| `4000 0000 0000 9979` | Processing (poll for the final status).                  |
| `4000 0000 0000 0341` | Provider error — responds `503`.                         |
| any other valid card  | Succeeds.                                                |

## Suggested frontend flow

```ts
// 1. Create the intent (amount in minor units).
const idempotencyKey = crypto.randomUUID()
const intent = await createPaymentIntent({ amount: 4999, currency: 'USD' }, idempotencyKey)

// 2. Confirm with the entered card.
let result = await confirmPaymentIntent(intent.id, cardNumber)

// 3. Branch on the status.
switch (result.status) {
  case 'succeeded':
    // show the receipt
    break
  case 'declined':
    // show result.error.message
    break
  case 'requires_action':
    // open result.nextAction.three_d_secure.url, then re-read the intent:
    result = await getPaymentIntent(intent.id)
    break
  case 'processing':
    // poll getPaymentIntent(intent.id) until it settles
    break
}
```

## Files

```
src/mocks/
  browser.ts          worker setup (setupWorker)
  config.ts           latency bounds, test cards, OTP
  data.ts             in-memory stores (intents, idempotency keys, challenges)
  types.ts            request/response and domain types
  lib/
    respond.ts        json() / error() helpers, shared error envelope
    delay.ts          jittered latency
    validation.ts     body parsing and parameter errors
  handlers/
    index.ts          combines all handlers
    merchant.ts
    payment-methods.ts
    payment-intents.ts
    three-ds.ts
```

## Extending

- **New endpoint:** add a handler module under `handlers/`, export an array, and spread it into
  `handlers/index.ts`. Use `json` / `error` from `lib/respond.ts` to keep responses consistent.
- **New test card:** add an entry to `TEST_CARDS` in `config.ts`. Nothing else needs to change —
  the confirm handler reads its behaviour from there.

All state lives in memory and resets on reload.
