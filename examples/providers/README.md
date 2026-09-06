# Real provider plugins

Three plugins written against real APIs: Stripe, Adyen and PayPal. They compile against the
real contract - `npm run typecheck` covers this folder - but nothing here has taken a
payment, so read them as a starting point rather than as something to install.

The plugins in `packages/provider-*` are shaped by the demo's mock backend. These are shaped
by the providers.

## The one rule

Every one of these calls **your** API, never the provider's. The secret key - Stripe `sk_`,
Adyen `x-api-key`, a PayPal client secret - stays on your server. See
[The backend a plugin talks to](../../docs/backend.md).

```text
browser: plugin  →  your API  →  provider's API
```

## What each one needs from your server

### Stripe (`stripe.ts`)

| Endpoint                     | Does                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| `POST /payments`             | `paymentIntents.create` from the plan id                      |
| `POST /payments/:id/confirm` | `paymentIntents.confirm` with the card or a payment method id |
| `GET /payments/:id`          | `paymentIntents.retrieve`                                     |
| `POST /payments/:id/cancel`  | `paymentIntents.cancel`                                       |

Return Stripe's `PaymentIntent` fields as they are: `status`, `next_action`,
`last_payment_error`. The plugin reads them directly, which is less mapping and less to get
wrong. Forward the `Idempotency-Key` header to Stripe verbatim.

The plugin handles `next_action.redirect_to_url`. It refuses `use_stripe_sdk`, because that
one needs Stripe.js running in the page - a different integration, an `sdk_handoff` action
with an adapter registered by the host. See
[Integrating a real payment SDK](../../docs/integrations.md).

### Adyen (`adyen.ts`)

| Endpoint                     | Does                                        |
| ---------------------------- | ------------------------------------------- |
| `POST /payments/sessions`    | reserve an order for the plan               |
| `POST /payments/:id`         | `/payments` with the payment method         |
| `POST /payments/:id/details` | `/payments/details` with whatever came back |
| `GET /payments/:id`          | the current state                           |
| `POST /payments/:id/cancel`  | `/cancels`                                  |

Pass Adyen's `resultCode` and `action` through unchanged. The plugin branches on
`action.type`: `redirect` becomes a redirect, `threeDS2` becomes a handoff to Adyen's own
component, which the host registers as an SDK adapter:

```ts
createBrowserRuntime({
  returnPath: '/payment/return',
  sdk: {
    adapters: [
      {
        sdk: 'adyen',
        request: async (params) => {
          const checkout = await AdyenCheckout({ clientKey, environment: 'test' })
          return await new Promise((resolve, reject) => {
            checkout
              .createFromAction({ type: 'threeDS2', token: params.token, subtype: params.subtype })
              .mount('#adyen-3ds2')
              .then(resolve, reject)
          })
        },
      },
    ],
  },
})
```

`Received` and `Pending` are real outcomes for local methods and can last days. The plugin
reports `processing`; let your webhook settle it and tell the shopper by email rather than
holding the page open.

### PayPal (`paypal.ts`)

| Endpoint                          | Does                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| `POST /paypal/orders`             | create the order, return the `payer-action` link as `approveUrl` |
| `GET /paypal/orders/:id`          | the order                                                        |
| `POST /paypal/orders/:id/capture` | **capture it**                                                   |
| `POST /paypal/orders/:id/cancel`  | void it                                                          |

The trap is at the end: the shopper coming back means the order is `APPROVED`, not paid.
Money moves on capture, and capture happens on your server. The plugin calls capture from
`resume` and never reads the query string.

## Using one

```ts
import { defineProvider } from '@checkout-kit/core'
import type { StripeConfig } from './examples/providers/stripe'

createCheckout({
  providers: [
    defineProvider({
      id: 'stripe',
      config: { baseUrl: '/api' } satisfies StripeConfig,
      load: () => import('./examples/providers/stripe'),
      eager: true,
    }),
  ],
  // ...
})
```

Then run the contract suite against it before writing any UI:

```ts
describeProviderContract({
  provider: stripeProvider,
  config: { baseUrl: 'http://payments.test/api' },
  handlers: yourMswHandlers,
  instrumentFor: (testCase) => card(SCENARIO_CARDS[testCase]),
  evidenceFor: (action) => ({ via: 'return_url', actionId: action.id, params: {} }),
  declineMessage: 'Your card was declined.',
})
```
