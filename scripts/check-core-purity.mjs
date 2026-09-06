// Some code has to run in a browser, in a Node test, in a worker and in a React Native
// bundle. TypeScript cannot check that for us: the DOM lib is needed for `fetch`, and it
// brings `window` along with it. So the rule is checked here - no browser-only globals, no
// bundler env - and anything that genuinely needs a browser lives elsewhere.

import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const NEUTRAL = [
  {
    path: '../packages/core/src',
    name: '@checkout-kit/core',
    escape: 'Move the code that needs a browser into @checkout-kit/runtime-browser.',
  },
  {
    // The half a React Native bundle imports. There is no window there at all.
    path: '../packages/webview-bridge/src/protocol',
    name: '@checkout-kit/webview-bridge/protocol',
    escape: 'Keep browser code in the package root, which only the web side imports.',
  },
  {
    path: '../packages/webview-bridge/src/host',
    name: '@checkout-kit/webview-bridge/host',
    escape: 'Keep browser code in the package root, which only the web side imports.',
  },
]
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

let failed = false

for (const target of NEUTRAL) {
  const root = fileURLToPath(new URL(target.path, import.meta.url))
  const violations = []

  for (const file of await walk(root)) {
    if (file.endsWith('.test.ts')) continue

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
    failed = true
    console.error(`${target.name} must stay platform-neutral, but found:\n`)
    for (const violation of violations) console.error(`  ${violation}`)
    console.error(`\n${target.escape}\n`)
  }
}

if (failed) process.exit(1)

console.log(
  `Platform-neutral, no browser globals and no bundler env: ${NEUTRAL.map((t) => t.name).join(', ')}.`,
)
