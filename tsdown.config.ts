import { defineConfig } from 'tsdown'

// One build for every package under packages/*.
//
// `unbundle` keeps the output 1:1 with the sources, so stack traces stay readable and
// tree-shaking is honest. `devExports` writes an extra `@pg/source` condition into each
// exports map: inside this repo the apps resolve through it and see TypeScript sources,
// while a published consumer falls through to `dist`. That way dev and prod take the same
// exports map instead of a path alias that hides mistakes in it.
export default defineConfig({
  workspace: 'packages/*',
  entry: ['src/index.ts', 'src/*/index.ts'],
  // ESM only. A dual build would ship two copies of every class, and `instanceof` starts
  // lying the moment a consumer mixes the two.
  format: ['esm'],
  unbundle: true,
  // oxc emits the .d.ts files; the tsc-based path does not support TypeScript 7 yet.
  dts: { oxc: true },
  exports: { devExports: '@pg/source' },
  publint: true,
  // `esmOnly` is the honest profile here: the package ships no CJS build, so the checks
  // for CJS consumers and for Node 10 style resolution do not apply to it.
  attw: { profile: 'esm-only' },
})
