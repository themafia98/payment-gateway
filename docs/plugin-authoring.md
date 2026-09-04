# Writing a payment plugin

> Русская версия: [plugin-authoring.ru.md](./plugin-authoring.ru.md)

A plugin is the only place that knows how one payment provider talks. Everything else —
the engine, the form, the challenge screen, the result pages — is written once and reused
for every integration.

This document is what you need to write one. It is short on purpose: the contract is four
methods, and most of the work is deciding how to say what your provider means.

## The shape of a plugin

```ts
import type { PaymentProvider, ProviderContext, PaymentProviderInstance } from '@pg/core'
import { createHttpClient } from '@pg/core/http'

export interface AcmeConfig {
  readonly baseUrl: string
  readonly apiKey: string
}

// Announce the config to the host's type system, so `defineProvider({ id: 'acme', ... })`
// is checked without the host importing any of this plugin's code.
declare module '@pg/core' {
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

Export the provider as the default too: the host registers it as
`load: () => import('@pg/provider-acme')`, and the registry unwraps a default export.

## The four verbs

**`createIntent`** starts a payment and returns what the domain calls a `PaymentIntent`.
If your API needs two round trips to produce one — register the order, then read it back —
make both here. The engine does not care how many requests a verb costs.

**`confirm`** presents the instrument. It either settles the payment or answers
`requires_action` with what has to happen next.

**`resume`** continues once that action has finished, and is handed the raw evidence the
runner collected. **This is where your protocol's meaning lives.** A verdict like
`transStatus=Y`, an `orderStatus` of 6, a `PaRes` blob, a wallet token: all of that is
interpreted here and nowhere else. It is the reason a bank doing 3-D Secure 1 and a
processor doing 3-D Secure 2 reach the identical checkout screen.

**`getIntent`** re-reads the payment. The engine calls it whenever evidence alone is not
enough, which is most of the time.

`cancel` is optional; declare `capabilities.cancel` only if you implement it.

## Actions: how you ask for the next step

Return `requires_action` with a `PaymentAction`, and the engine finds a runner for it. Four
kinds cover every integration in this repo:

| Kind             | Use it when                                           | Evidence you get back          |
| ---------------- | ----------------------------------------------------- | ------------------------------ |
| `redirect`       | the shopper must go somewhere — a frame or the window | `post_message` or `return_url` |
| `collect_fields` | your own inputs render inside the checkout            | `post_message`                 |
| `sdk_handoff`    | a script of yours drives the payment                  | `sdk_callback`                 |
| `poll`           | nothing to show; the answer arrives later             | `poll`                         |

Two fields do more work than they look:

- **`surface`** is a preference, not a demand. The host may run the same action in a frame
  or in the whole window, and the runner produces the matching evidence either way.
- **`returnUrlField`** names the field the absolute return URL must be written into
  (`TermUrl`, `returnUrl`, whatever your API calls it). Fill it in yourself and you will get
  it wrong under a deployment served from a sub-path — only the host knows its own base.

Set `completion.correlationField` when your provider echoes the transaction id under a name
of its own (`challengeId`, `MD`). It is what stops a stale message from an earlier attempt
settling the current payment.

## Rules the types cannot enforce

**`confirm` and `resume` never throw.** A network failure, a malformed reply, an unknown
status — all of it comes back as `{ status: 'error' }`. Those two report what happened to
the money, and an exception leaves the caller unable to say. `createIntent`, `getIntent`
and `cancel` may reject; the engine turns that into an error result for them.

**Evidence is a hint, not the truth.** What comes back from a redirect or a `postMessage`
says where the browser has been. Whether money moved is a question only your API can
answer, so ask it. The hosted-page plugin ignores `status=success` in the return URL
entirely and re-reads the order — there is an end-to-end test that walks in announcing
success without having paid, and lands on the failure page.

**Report the issuer's message, not your own.** When a card is declined, the shopper reads
what you return to a support line. `"Your card was declined."` is the issuer speaking;
`"Unexpected status declined"` is a bug that once shipped.

**A declined card is not an error.** Some APIs report a refusal as a successful call with a
status field, others as an HTTP error. Map both to `declined` — `error` is for the times
your provider or the network failed, when nobody knows what happened to the payment.

**Capabilities are for validation and copy.** They exist so the host can check it has the
runners you need and decide whether to render a card form. Never let the checkout branch on
them to decide what a payment requires: the issuer decides that at transaction time, and
the only honest signal is the action you actually returned.

**Never let instrument data back out.** Nothing you return may contain the card number,
not even in a `detail` field for logging.

## Prove it

Every plugin passes the same suite:

```ts
import { describeProviderContract } from '@pg/conformance'
import { acmeHandlers } from './test-backend'
import { SCENARIO_CARDS, declineMessage } from '@pg/testing'
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

Fifteen tests, and they check the rules above rather than your implementation: that a
decline carries the issuer's message, that evidence for an action you never issued does not
approve anything, that a repeated resume answers the same way twice instead of throwing,
that an outage becomes a result rather than an exception, that a declared capability is
backed by a method, and that no card number comes back out.

If a test fails and the assertion looks wrong for your provider, say so — the suite
describes what the engine and the UI are entitled to assume, and an integration that cannot
satisfy it is one they cannot safely use.

## Registering it

```ts
import { defineProvider } from '@pg/core'
import type { AcmeConfig } from '@pg/provider-acme'

defineProvider({
  id: 'acme',
  config: { baseUrl: '/api/acme', apiKey } satisfies AcmeConfig,
  load: () => import('@pg/provider-acme'),
})
```

The type import is erased at build time; the dynamic import means the plugin's code is a
chunk nobody downloads until the provider is chosen. Registering it asserts that the host
has runners for every action you can return, so a missing one is a startup error rather
than a surprise halfway through someone's payment.
