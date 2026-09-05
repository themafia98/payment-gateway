# Releasing

Nothing is published yet. Every package under `packages/` is `"private": true`, so
`changeset publish` would skip all of them today. This file describes the process that is in
place for when that changes.

## Before the first release

Two things are still true and both have to stop being true first:

1. **All five plugins are written against a mock backend.** None has taken a real payment.
   Publishing them as integrations would promise something that does not exist. At least one
   plugin should run against a provider's sandbox first.
2. **The `@checkout-kit` scope is not claimed on npm.** Check it, and create the
   organisation, before removing `private`.

Then, per package: remove `"private": true` and add
`"publishConfig": { "access": "public" }`.

## Day to day

Anything that changes a package needs a changeset:

```bash
npm run changeset
```

It asks which packages changed and whether the change is a patch, a minor or a major, then
writes a small markdown file in `.changeset/`. Commit that file with your change.

Write the summary for someone upgrading, not for someone reviewing the diff. "Adds a
`display` action for QR payments" is useful. "Refactors runner registry" is not.

## Cutting a release

```bash
npm run version   # applies the changesets: bumps versions, writes CHANGELOG.md files
npm run release   # builds every package, then publishes what changed
```

`npm run version` also refreshes the lockfile, because the workspace packages reference each
other and their versions move together.

## What the versions mean

These packages depend on each other through `peerDependencies`, so a breaking change in
`@checkout-kit/core` is a breaking change for every plugin. In practice:

- **major** — the plugin contract changed. A new required field on `PaymentAction`, a
  changed method signature, a removed export. Every plugin has to be updated.
- **minor** — something was added that existing plugins can ignore. A new action kind, a new
  optional field, a new runner.
- **patch** — a fix that does not change the contract.

The conformance suite is the test of this: if a change makes an existing plugin fail it, the
change is a major.
