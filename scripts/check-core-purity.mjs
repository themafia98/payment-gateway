// The core is meant to run in a browser, in a Node test and in a worker. TypeScript
// cannot enforce that on its own: the DOM lib is needed for `fetch` and `Response`, and it
// drags in `window` and friends along with them. So the rule is checked here instead.
//
// Two rules, both mechanical:
//   1. no browser-only globals inside packages/core
//   2. no bundler-specific environment access (`import.meta.env`)
//
// Runners that legitimately touch the DOM live in @pg/runtime-browser, which is exempt.

import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../packages/core/src', import.meta.url))
const FORBIDDEN = [
  { pattern: /\bwindow\b/, hint: 'window' },
  { pattern: /\bdocument\b/, hint: 'document' },
  { pattern: /\blocalStorage\b/, hint: 'localStorage' },
  { pattern: /\bsessionStorage\b/, hint: 'sessionStorage' },
  { pattern: /\bnavigator\b/, hint: 'navigator' },
  { pattern: /import\.meta\.env/, hint: 'import.meta.env' },
  { pattern: /\bprocess\.env\b/, hint: 'process.env' },
]

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) return walk(full)
      return entry.name.endsWith('.ts') ? [full] : []
    }),
  )
  return files.flat()
}

const violations = []

for (const file of await walk(ROOT)) {
  const source = await readFile(file, 'utf8')
  source.split('\n').forEach((line, index) => {
    // Comments explain the rule; they should not trip it.
    const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '')
    for (const { pattern, hint } of FORBIDDEN) {
      if (pattern.test(code)) {
        violations.push(`${relative(process.cwd(), file)}:${index + 1}  ${hint}`)
      }
    }
  })
}

if (violations.length > 0) {
  console.error('@pg/core must stay platform-neutral, but found:\n')
  for (const violation of violations) console.error(`  ${violation}`)
  console.error('\nMove the code that needs a browser into @pg/runtime-browser.')
  process.exit(1)
}

console.log('@pg/core is platform-neutral: no browser-only globals, no bundler env access.')
