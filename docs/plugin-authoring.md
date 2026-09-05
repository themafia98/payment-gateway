# Writing a payment plugin

> Русская версия: [plugin-authoring.ru.md](./plugin-authoring.ru.md)

A plugin is the only place that knows how one payment provider talks. Everything else — the
engine, the form, the action screen, the result pages — is written once and reused by every
integration.

The contract is four methods. Most of the work is deciding how to express what your provider
means.

## The shape of a plugin

```ts
import type { PaymentProvider, ProviderContext, PaymentProviderInstance } from '@checkout-kit/core'
import { createHttpClient } from '@checkout-kit/core/http'

export interface AcmeConfig {
  readonly baseUrl: string
  readonly apiKey: string
}

// Tell the host's type system about this config, so `defineProvider({ id: 'acme', ... })`
// is type-checked without the host importing any of this plugin's code.
declare module '@checkout-kit/core' {
  interface ProviderConfigRegistry {
    acme: AcmeConfig
  }
}

export const acmeProvider: PaymentProvider<AcmeConfig> = {
  id: 'acme',
  displayName: 'Acme Payments',
  capabilities: {
    instruments: ['card'],
    actions: ['redirect'],
    surfaces: ['iframe', 'top'],
    authentication: ['none', '3ds2'],
    session: 'lazy',
    cancel: true,
    poll: false,
    idempotency: 'header',
  },
  create: (ctx: ProviderContext<AcmeConfig>): PaymentProviderInstance => {
    const http = createHttpClient({ baseUrl: ctx.config.baseUrl, fetch: ctx.fetch })
    return {
      createIntent: async (input, opts) => {
        /* ... */
      },
      confirm: async (intentId, instrument, opts) => {
        /* ... */
      },
      resume: async (intentId, evidence, opts) => {
        /* ... */
      },
      getIntent: async (intentId, opts) => {
        /* ... */
      },
      cancel: async (intentId, opts) => {
        /* ... */
      },
    }
  },
}

export default acmeProvider
```

Export the provider as the default as well. A host registers it with
`load: () => import('@checkout-kit/provider-acme')`, and the registry unwraps a default export.

## The four methods

**`createIntent`** starts a payment and returns a `PaymentIntent`. If your API needs two
requests to produce one — register the order, then read it back — do both here. The engine
does not care how many requests a method makes.

**`confirm`** presents the instrument. It either settles the payment or answers
`requires_action` with the next step.

The instrument is one of five kinds, and `capabilities.instruments` must list exactly the
ones you accept - it is what the checkout builds its form from, and the contract suite
checks both directions:

| Kind             | What it carries                 | Who collects it                  |
| ---------------- | ------------------------------- | -------------------------------- |
| `card`           | number, expiry, security code   | the checkout's own form          |
| `token`          | an id for a card saved earlier  | your API, on a previous visit    |
| `hosted_session` | an id for a session you started | your API                         |
| `wallet`         | a payload from a wallet SDK     | the wallet, if the host holds it |
| `none`           | nothing                         | somewhere else entirely          |

Turn down a kind you do not take with the code `unsupported_instrument`. It is the one error
code the engine and the suite read: any other code means "this particular instrument failed",
which is a different thing.

A saved card is worth calling out, because it is easy to get wrong: it is `token`, the
browser holds an id and four digits, and the payment carries on exactly as a typed card
would - it can be declined, and the bank can still ask for authentication.

**`resume`** continues after that step finished. It receives the raw evidence the runner
collected. **This is where your protocol's meaning lives.** A `transStatus` of `Y`, an
`orderStatus` of 6, a `PaRes` blob, a wallet token — you read all of that here and nowhere
else. That is why a bank using 3-D Secure 1 and a processor using 3-D Secure 2 both reach
the same checkout screen.

**`getIntent`** reads the payment again. The engine calls it whenever evidence alone is not
enough, which is most of the time.

`cancel` is optional. Only set `capabilities.cancel` if you implement it.

## Actions: asking for the next step

Return `requires_action` with a `PaymentAction`, and the engine finds a runner for it. Five
kinds cover every integration here:

| Kind             | Use when                                             | Evidence you get back          |
| ---------------- | ---------------------------------------------------- | ------------------------------ |
| `redirect`       | the shopper must go somewhere: a frame or the window | `post_message` or `return_url` |
| `collect_fields` | your own inputs render inside the checkout           | `post_message`                 |
| `sdk_handoff`    | a script of yours drives the payment                 | `sdk_callback`                 |
| `display`        | show a QR or a code; it is paid in another app       | `poll`                         |
| `poll`           | nothing to show; the answer comes later              | `poll`                         |

Two fields matter more than they look:

- **`surface`** is a preference, not a rule. The host may run the same action in a frame or
  in the whole window, and the runner returns matching evidence either way.
- **`returnUrlField`** names the field where the absolute return URL must go (`TermUrl`,
  `returnUrl`, whatever your API calls it). Do not build that URL yourself: only the host
  knows its own base path, and hand-built URLs break when the app is served from a sub-path.

Set `completion.correlationField` if your provider returns the transaction id under its own
name (`challengeId`, `MD`). It stops an old message from a previous attempt from finishing
the current payment.

### `display`, and how a payment finishes with nobody watching

PIX, UPI, BLIK, PromptPay, Konbini: the shopper is shown a code and pays it in another app.
Nothing in the browser can see that happen, so `completion` is always
`{ via: 'poll', intervalMs, timeoutMs }`.

The engine then does two things at once: it runs the display runner, which shows the code
and waits, and it asks your `getIntent` on the interval you gave. Whichever finishes first
stops the other - so the shopper can still walk away, and an expired code stops polling
instead of running forever. When polling wins you get `{ via: 'poll' }` evidence, and your
`resume` reads the payment back and says what happened.

Give `value` always: a shopper paying on the same phone they are reading on cannot scan
their own screen. Add `imageUrl` if your provider renders the QR - the kit ships no QR
encoder - and `deeplink` if it offers one.

## Rules that types cannot enforce

**`confirm` and `resume` never throw.** A network failure, a bad reply, an unknown status —
all of it is returned as `{ status: 'error' }`. These two report what happened to the money,
and an exception cannot. `createIntent`, `getIntent` and `cancel` may reject; the engine
turns that into an error result.

**Evidence is a hint, not the truth.** What comes back from a redirect or a `postMessage`
tells you where the browser has been. Only your API knows whether money moved, so ask it.
The hosted-page plugin ignores `status=success` in the return URL and reads the order again.
There is an end-to-end test that arrives claiming success without paying, and it lands on the
failure page.

**Return the issuer's message, not your own.** When a card is declined, the shopper may read
your text out to their bank. `"Your card was declined."` is the issuer speaking.
`"Unexpected status declined"` is a bug that once shipped here.

**A declined card is not an error.** Some APIs report a refusal as a successful call with a
status field, others as an HTTP error. Map both to `declined`. Use `error` only when your
provider or the network failed and nobody knows what happened to the payment.

**Capabilities are for validation and copy.** The host uses them to check it has the right
runners, and to decide whether to render a card form. Do not let the checkout use them to
decide what a payment needs: the issuer decides that during the transaction, and the only
reliable signal is the action you returned.

**Never return instrument data.** Nothing you return may contain the card number, not even
inside `detail` for logging.

## Prove it

Every plugin runs the same suite:

```ts
import { describeProviderContract } from '@checkout-kit/conformance'
import { acmeHandlers } from './test-backend'
import { SCENARIO_CARDS, declineMessage } from '@checkout-kit/testing'
import { acmeProvider } from './provider'

describeProviderContract({
  provider: acmeProvider,
  config: { baseUrl: 'http://acme.test', apiKey: 'test' },
  handlers: acmeHandlers,
  declineMessage: declineMessage(),
  instrumentFor: (testCase) => card(SCENARIO_CARDS[testCase]),
  evidenceFor: (action, outcome) => ({
    via: 'post_message',
    actionId: action.id,
    origin: 'https://acs.test',
    data: { transStatus: outcome === 'pass' ? 'Y' : 'N' },
  }),
})
```

Fifteen tests. They check the rules above, not your implementation: a decline carries the
issuer's message; evidence for an action you never issued does not approve anything; a
repeated resume answers the same way twice instead of throwing; an outage becomes a result
and not an exception; a declared capability has a method behind it; and no card number comes
back out.

If a test fails and the assertion looks wrong for your provider, say so. The suite describes
what the engine and the UI are allowed to assume, and an integration that cannot meet it is
one they cannot use safely.

## Worked examples

[Real providers, mapped onto the contract](./real-world-providers.md) shows what Stripe,
Adyen, PayPal, the wallets and a bank acquirer return, and which action to produce for each.
The regional guides go further: [Europe](./providers/europe.md),
[the Americas](./providers/americas.md), [Asia](./providers/asia.md).

## Registering it

```ts
import { defineProvider } from '@checkout-kit/core'
import type { AcmeConfig } from '@checkout-kit/provider-acme'

defineProvider({
  id: 'acme',
  config: { baseUrl: '/api/acme', apiKey } satisfies AcmeConfig,
  load: () => import('@checkout-kit/provider-acme'),
})
```

The type import is erased at build time. The dynamic import puts the plugin's code in a
separate chunk that nobody downloads until the provider is chosen. Registering also checks
that the host has runners for every action you can return, so a missing runner is a startup
error instead of a surprise during a payment.
