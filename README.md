# Payment Gateway

An embeddable checkout, and the payment integrations behind it as plugins.

The core is a headless engine: it creates a payment, presents an instrument, runs whatever
step the provider asks for next, and reports what happened. It does not know what 3-D
Secure is, what a hosted payment page is, or what a wallet is. Five plugins do, and adding
a sixth changes nothing in the core.

Everything runs on the front end: an in-browser mock backend answers the APIs, and a
standalone https server plays the bank, so the whole flow — approval, decline,
authentication in a frame and as a full-page redirect, asynchronous settlement, cancelling,
receipts — can be exercised with no server at all.

## Getting started

```bash
npm install

npm run dev:mock   # the demo checkout, with the mock payment backend
npm run dev:bank   # the 3-D Secure bank simulator (a second terminal, for the full flow)
```

The bank simulator serves https with a self-signed certificate: open
`https://localhost:5100/` once and accept it. See
[its notes](./apps/bank-sim/README.md) for how to generate the certificate.

```bash
npm run typecheck    # every package and app
npm run test         # unit tests and the plugin conformance suite
npm run test:e2e     # the checkout, end to end, against every integration
npm run build        # packages, then the demo
npm run verify:dist  # build the demo against the packages' published entry points
npm run purity       # fail if anything browser-only creeps into the core
```

## The one idea

Every integration is the same loop:

```text
createIntent → confirm(instrument) → [ action → run → evidence → resume ]* → terminal
```

What differs between a card processor, a bank, a hosted page, hosted fields and a wallet is
only **which action the provider returned** and **which runner executes it**. That claim is
checked rather than asserted: one Playwright spec file, naming no provider anywhere, runs
against all five.

| Integration        | instrument | first action                    | completes via  |
| ------------------ | ---------- | ------------------------------- | -------------- |
| Card processor     | `card`     | `redirect` into a frame         | `post_message` |
| Acquiring bank     | `card`     | `redirect` with a `PaReq`       | `post_message` |
| Bank payment page  | `none`     | `redirect` taking the window    | `return_url`   |
| Hosted card fields | `none`     | `collect_fields` in a frame     | `post_message` |
| Wallet             | `none`     | `sdk_handoff` to another script | `sdk_callback` |

## Packages

| Package                      | What it is                                                              |
| ---------------------------- | ----------------------------------------------------------------------- |
| `@pg/core`                   | domain, plugin contract, checkout engine, HTTP client. No React, no DOM |
| `@pg/runtime-browser`        | the runners that execute actions: frames, redirects, scripts, storage   |
| `@pg/react`                  | hooks over the engine, and a mount point for actions                    |
| `@pg/ui`                     | the visual kit: a few components and one themable stylesheet            |
| `@pg/provider-psp`           | a Stripe-shaped API: JSON, idempotency header, 3-D Secure 2             |
| `@pg/provider-acquiring`     | direct bank acquiring: form-urlencoded, numeric statuses, 3-D Secure 1  |
| `@pg/provider-hpp`           | a hosted payment page: the shopper pays on the bank's own site          |
| `@pg/provider-hosted-fields` | the provider renders the card inputs and hands back a token             |
| `@pg/provider-wallet`        | a third-party SDK draws its own sheet                                   |
| `@pg/testing`                | the mock backend, the card table, and test doubles for the engine       |
| `@pg/conformance`            | the contract every plugin has to pass                                   |

## Using it in an app

```tsx
import { createCheckout, defineProvider } from '@pg/core'
import { createBrowserRuntime } from '@pg/runtime-browser'
import { CheckoutProvider, useCheckout, PaymentActionHost } from '@pg/react'
import '@pg/ui/styles.css'

const runtime = createBrowserRuntime({ returnPath: '/payment/return' })

export const checkout = createCheckout({
  providers: [
    defineProvider({
      id: 'psp',
      config: { baseUrl: '/api', acsOrigin: 'https://acs.example' },
      load: () => import('@pg/provider-psp'),
      eager: true,
    }),
  ],
  defaultProviderId: 'psp',
  runners: runtime.runners,
  storage: runtime.storage,
  returnUrl: runtime.returnUrl,
})
```

Wrap the app in `<CheckoutProvider engine={checkout}>`, call `engine.pay(...)` from your
form, render `<PaymentActionHost/>` wherever an action is allowed to appear, and call
`engine.hydrate(params)` on the route a provider returns to. The demo in `apps/demo` does
exactly this and nothing more.

To add an integration of your own, see
**[Writing a payment plugin](./docs/plugin-authoring.md)**.

## Repository layout

An npm workspaces monorepo.

```text
packages/        the checkout packages listed above
apps/demo/       a checkout that uses them, with its e2e suite
apps/bank-sim/   the 3-D Secure bank simulator, on its own https origin
docs/            architecture and security notes
```

Inside the repo the apps resolve packages through a `@pg/source` condition, so they build
against TypeScript sources; `npm run verify:dist` builds them the way a published consumer
would, and CI runs both.

## Architecture and docs

Every doc exists in English and Russian, except the bank simulator's notes.

- **Architecture** ([English](./docs/architecture.md) / [Русский](./docs/architecture.ru.md)) —
  what the pieces are, how a payment flows through them, and why the seams are where they
  are.
- **Writing a payment plugin** ([English](./docs/plugin-authoring.md) / [Русский](./docs/plugin-authoring.ru.md)) —
  the contract, the rules that types cannot enforce, and the suite a plugin must pass.
- **Iframes and 3-D Secure** ([English](./docs/iframe.md) / [Русский](./docs/iframe.ru.md)) —
  how an embedded bank page is sandboxed and secured.
- **Security headers on the challenge page** ([English](./docs/security-headers.md) / [Русский](./docs/security-headers.ru.md)) —
  every header the bank simulator sends, one by one.
- **Mock payment API** ([English](./packages/testing/README.md) / [Русский](./packages/testing/README.ru.md)) —
  endpoints, the payment state machine, test cards, and why a retried request must not
  charge twice.
- **[Bank simulator](./apps/bank-sim/README.md)** — the standalone https bank, its two
  3-D Secure protocols, and where to inspect the security surface in DevTools.

## Tooling notes

Packages are built with [tsdown](https://tsdown.dev) (rolldown + oxc) and validated with
publint and are-the-types-wrong on every build. Declarations are emitted by oxc, which
needs every exported binding to carry an explicit type — the reason `isolatedDeclarations`
is on in every package.

ESM only, deliberately: a dual build ships two copies of every class, and `instanceof`
starts lying the moment a consumer mixes them.

### Expanding the Oxlint configuration

For a production app, consider enabling type-aware lint rules by installing
`oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "plugins": ["typescript", "oxc", "react"],
  "categories": { "correctness": "error", "pedantic": "warn" },
  "rules": { "typescript/no-floating-promises": "error" },
  "typeAware": true
}
```
