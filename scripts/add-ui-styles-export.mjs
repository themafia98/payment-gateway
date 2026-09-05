// The kit's stylesheet is hand-written and lives at the package root, so it resolves the
// same before a build, after one, and from a published tarball. (Tailwind resolves CSS
// imports with its own resolver, which knows nothing about our `@checkout-kit/source` condition.)
//
// tsdown regenerates the exports map from the JavaScript entry points, so this runs
// afterwards and puts back the one entry it cannot know about.

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const manifestPath = fileURLToPath(new URL('../packages/ui/package.json', import.meta.url))
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

const withStyles = (exports) => {
  const next = {}
  for (const [specifier, value] of Object.entries(exports)) {
    // Kept before `./package.json`, which conventionally goes last.
    if (specifier === './package.json') next['./styles.css'] = './styles.css'
    next[specifier] = value
  }
  return next
}

manifest.exports = withStyles(manifest.exports)
if (manifest.publishConfig?.exports) {
  manifest.publishConfig.exports = withStyles(manifest.publishConfig.exports)
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log('@checkout-kit/ui: styles.css kept in the exports map')
