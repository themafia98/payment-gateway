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
npm run dev:acs    # 3-D Secure ACS simulator (run alongside dev:mock)
```

For the full 3-D Secure flow, run `dev:acs` and `dev:mock` in two terminals. See
the ACS notes below for the one-time certificate step.

## Architecture and docs

The app follows Clean / Hexagonal ideas laid out with Feature-Sliced Design. Start
here:

- **[Architecture (English)](./docs/architecture.md)** - why the code is shaped
  this way and how the pieces fit, with diagrams.
- **[Архитектура (Русский)](./docs/architecture.ru.md)** - то же на русском.
- **Iframes and 3-D Secure** ([English](./docs/iframe.md) / [Русский](./docs/iframe.ru.md)) -
  how the embedded bank page is sandboxed and secured (sandbox flags, headers,
  postMessage, iframe vs redirect).
- **[Mock backend](./src/mocks/README.md)** - the MSW fake API, endpoints and test
  cards.
- **[3-D Secure ACS simulator](./acs/README.md)** - the standalone bank server,
  iframe vs redirect modes, and the security headers.

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
