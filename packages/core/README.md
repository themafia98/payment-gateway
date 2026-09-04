# @pg/core

The headless half of the checkout: the vocabulary a payment is described in, the contract
a payment integration implements, and an HTTP client with no opinions about payments.

No React. No DOM manipulation. No bundler environment. It compiles for a browser, a Node
test and a worker alike, and `npm run purity` fails the build if a browser-only global
sneaks in.

## What lives here

| Import              | Contents                                                      |
| ------------------- | ------------------------------------------------------------- |
| `@pg/core`          | domain types, the plugin contract, `Logger`                   |
| `@pg/core/domain`   | just the domain: intent, instrument, action, evidence, result |
| `@pg/core/provider` | just the plugin contract: `PaymentProvider`, capabilities     |
| `@pg/core/http`     | `createHttpClient` - base URL, body encoding, error parsing   |

## The one idea

Every integration - a PSP host-to-host API, a bank acquirer, a hosted payment page,
hosted card fields in the provider's iframe, a wallet SDK - is the same loop:

```
createIntent → confirm(instrument) → [ action → run → evidence → resume ]* → terminal
```

What differs between them is only **which `PaymentAction` the provider returned** and
**which runner executes it**. The core does not know the words "3-D Secure", "hosted
payment page" or "Apple Pay", and adding a provider that uses them must not require
changing anything in this package.

## Rules that the types alone cannot enforce

**`confirm` and `resume` never throw.** A network failure, a malformed reply, an unknown
status - all of it comes back as `{ status: 'error' }`. Those two report what happened to
the money, and a thrown error leaves the caller unable to say. `createIntent`, `getIntent`
and `cancel` may reject; the engine converts that into an error result for them.

**Capabilities are for validation and copy, never for control flow.** Writing
`if (caps.authentication.includes('3ds2'))` is a bug: whether a payment needs
authentication is decided by the issuer at transaction time. The only honest signal is the
`PaymentAction` the provider actually returned.

**Evidence is a hint, not the truth.** What comes back from a redirect or a `postMessage`
says where the browser has been, not whether money moved. A status is only believed after
the intent has been re-read from the provider.

**Errors are data.** `PaymentError` carries a `code`; consumers branch on that. Thrown
classes do not survive a package boundary reliably, which is also why this package ships
ESM only - a dual build would put two copies of every class in the graph and make
`instanceof` lie.
