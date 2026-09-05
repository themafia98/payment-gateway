import { defineConfig } from 'tsdown'

// One build for every package under packages/*.
//
// `unbundle` keeps the output 1:1 with the sources, so stack traces stay readable.
// `devExports` adds a `@checkout-kit/source` condition to each exports map: inside this repo the apps
// resolve through it to TypeScript sources, and a published consumer falls through to
// `dist`. Both take the same exports map, so mistakes in it show up here.
export default defineConfig({
  workspace: 'packages/*',
  entry: ['src/index.ts', 'src/*/index.ts'],
  // ESM only. A dual build would ship two copies of every class, and `instanceof` starts
  // lying the moment a consumer mixes the two.
  format: ['esm'],
  unbundle: true,
  // oxc emits the .d.ts files; the tsc-based path does not support TypeScript 7 yet.
  dts: { oxc: true },
  exports: { devExports: '@checkout-kit/source' },
  publint: true,
  // are-the-types-wrong runs separately, in `npm run check:types`. Checking eleven packages
  // in parallel here failed intermittently while packing them.
})
