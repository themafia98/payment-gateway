# Payment Gateway

A payment checkout UI built with React, TypeScript and Vite. It runs entirely on
the front end for development: a mock payment backend (MSW) and a standalone
3-D Secure "bank" server let you exercise the full flow - pay, card decline,
3-D Secure (iframe and full-page redirect), and receipt download - with no real
server.

## Getting started

```bash
npm install

npm run dev        # app only
npm run dev:mock   # app + mock payment backend (MSW)
npm run dev:bank   # 3-D Secure ACS simulator (run alongside dev:mock)
```

For the full 3-D Secure flow, run `dev:bank` and `dev:mock` in two terminals. See
the ACS notes below for the one-time certificate step.

## Repository layout

This is an npm workspaces monorepo.

```
apps/demo/       the checkout app (React SPA) with its MSW mock backend and e2e tests
apps/bank-sim/   the standalone 3-D Secure ACS simulator (its own https origin)
packages/        reusable checkout packages (see below)
docs/            architecture and security notes
```

Root scripts delegate to the workspaces, so `npm run dev:mock` and friends still work
from the repository root.

## Architecture and docs

The app follows Clean / Hexagonal ideas laid out with Feature-Sliced Design. Every
doc below exists in English and Russian, except the ACS notes. Start here:

- **Architecture** ([English](./docs/architecture.md) / [Русский](./docs/architecture.ru.md)) -
  why the code is shaped this way and how the pieces fit, with diagrams.
- **Iframes and 3-D Secure** ([English](./docs/iframe.md) / [Русский](./docs/iframe.ru.md)) -
  how the embedded bank page is sandboxed and secured (sandbox flags, headers,
  postMessage, iframe vs redirect).
- **Security headers on the challenge page** ([English](./docs/security-headers.md) / [Русский](./docs/security-headers.ru.md)) -
  every header the ACS sends, one by one: CSP, `X-Frame-Options`, `nosniff`,
  COOP / COEP / CORP, `Referrer-Policy` and the cookie flags.
- **Mock payment API** ([English](./packages/testing/README.md) / [Русский](./packages/testing/README.ru.md)) -
  the MSW fake backend: endpoints, the PaymentIntent state machine, test cards, and
  **idempotency** ([English](./packages/testing/README.md#idempotency--making-retry-safe) /
  [Русский](./packages/testing/README.ru.md#идемпотентность--как-сделать-повтор-безопасным)) -
  why a retried `POST /payment-intents` must not charge twice.
- **[3-D Secure ACS simulator](./apps/bank-sim/README.md)** - the standalone bank server, iframe
  vs redirect modes, and where to inspect the security surface in DevTools.

## Tooling notes

Two official Vite React plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### Expanding the Oxlint configuration

For a production app, consider enabling type-aware lint rules by installing
`oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules)
for the full list.
