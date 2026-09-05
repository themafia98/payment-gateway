# @checkout-kit/core

The headless half of the checkout: the vocabulary a payment is described in, the contract
a payment integration implements, and an HTTP client with no opinions about payments.

No React, no DOM, no bundler environment. It compiles for a browser, a Node test and a
worker, and `npm run purity` fails the build if a browser-only global gets in.

## What lives here

| Import                        | Contents                                                      |
| ----------------------------- | ------------------------------------------------------------- |
| `@checkout-kit/core`          | domain types, the plugin contract, `Logger`                   |
| `@checkout-kit/core/domain`   | just the domain: intent, instrument, action, evidence, result |
| `@checkout-kit/core/provider` | just the plugin contract: `PaymentProvider`, capabilities     |
| `@checkout-kit/core/http`     | `createHttpClient` - base URL, body encoding, error parsing   |

## The idea

Every integration - a card processor, a bank, a hosted payment page, hosted card fields, a
wallet SDK - is the same loop:

```
createIntent → confirm(instrument) → [ action → run → evidence → resume ]* → terminal
```

Only two things differ: **which `PaymentAction` the provider returned** and **which runner
executes it**. The core does not know the words "3-D Secure", "hosted payment page" or
"Apple Pay", and adding a provider that uses them must not change anything here.

## Rules that the types alone cannot enforce

**`confirm` and `resume` never throw.** A network failure, a bad reply, an unknown status -
all of it comes back as `{ status: 'error' }`. These two report what happened to the money,
and an exception cannot. `createIntent`, `getIntent` and `cancel` may reject; the engine
turns that into an error result.

**Capabilities are for validation and copy, not control flow.** Writing
`if (caps.authentication.includes('3ds2'))` is a bug: the issuer decides whether a payment
needs authentication, during the transaction. The only reliable signal is the
`PaymentAction` the provider returned.

**Evidence is a hint, not the truth.** What comes back from a redirect or a `postMessage`
says where the browser has been, not whether money moved. A status is only believed after
the intent has been re-read from the provider.

**Errors are data.** `PaymentError` carries a `code`, and consumers branch on that. Classes
do not survive a package boundary reliably, which is also why this package is ESM only: a
dual build puts two copies of every class in the graph and `instanceof` starts giving the
wrong answer.
