// Checks every package's type declarations the way a consumer would resolve them, with
// are-the-types-wrong.
//
// It runs here rather than inside the bundler because the bundler checks all eleven packages
// at once, and packing eleven of them in parallel occasionally returned nothing at all -
// a build that failed with "Unexpected end of JSON input" once in a while and passed on a
// retry. One at a time is slower and always says the same thing.

import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packagesDir = fileURLToPath(new URL('../packages', import.meta.url))
const packages = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

// ESM only, so the checks for CJS consumers and Node 10 resolution do not apply.
const args = ['--profile', 'esm-only', '--pack']

// attw resolves *types*. A stylesheet has none, so its entry point is excluded rather than
// reported as broken.
const excluded = { ui: ['styles.css'] }

const excludeFor = (name) => (excluded[name] ? ['--exclude-entrypoints', ...excluded[name]] : [])

// The bin is resolved from the package manifest rather than shelled out to, so the
// arguments are never re-parsed by a shell.
const require = createRequire(import.meta.url)
const attwPackage = require('@arethetypeswrong/cli/package.json')
const attwCli = fileURLToPath(
  new URL(
    attwPackage.bin.attw,
    pathToFileURL(require.resolve('@arethetypeswrong/cli/package.json')),
  ),
)

const failed = []

for (const name of packages) {
  const result = spawnSync(
    process.execPath,
    // The package path goes first: `--exclude-entrypoints` takes a list, and a path after
    // it is swallowed as another entry point.
    [attwCli, `${packagesDir}/${name}`, ...args, ...excludeFor(name)],
    { stdio: 'inherit' },
  )
  if (result.status !== 0) failed.push(name)
}

if (failed.length > 0) {
  console.error(`\nType declarations are wrong in: ${failed.join(', ')}`)
  process.exit(1)
}

console.log(`\nType declarations resolve correctly in all ${packages.length} packages.`)
