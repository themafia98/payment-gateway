// Inside this repo the apps resolve workspace packages through the `@pg/source`
// condition, so they compile against TypeScript sources. That is convenient, and it hides
// exactly one class of bug: a broken `exports` map, which only a real consumer would hit.
//
// This script builds the demo the way a published consumer would - no source condition, so
// every import lands on the built `dist` entry points named in each package.json.

import { spawnSync } from 'node:child_process'

// `npm_execpath` is set by npm for its own scripts; running it through the current node
// binary keeps this shell-free, which matters on Windows where `npm` is a .cmd shim.
const npmCli = process.env.npm_execpath

const run = (args, env) => {
  const [command, argv] = npmCli
    ? [process.execPath, [npmCli, ...args]]
    : [process.platform === 'win32' ? 'npm.cmd' : 'npm', args]

  const result = spawnSync(command, argv, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run(['run', 'build:packages'])
run(['run', 'build', '-w', '@pg/demo'], { PG_USE_DIST: '1' })

console.log('\nThe demo builds against the packages’ published entry points.')
