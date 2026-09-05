// The apps normally resolve packages through the `@pg/source` condition and compile
// against sources. That hides one kind of bug: a broken `exports` map. This builds the demo
// the way a published consumer would, so every import has to land on `dist`.

import { spawnSync } from 'node:child_process'

// npm sets `npm_execpath` for its own scripts. Running it through node keeps this
// shell-free, which matters on Windows where `npm` is a .cmd shim.
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
