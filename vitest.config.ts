import { defineConfig } from 'vitest/config'

// Split by what each layer actually needs, not by folder.
//
// The core and the plugins run in Node with no DOM at all - which is a claim as much as a
// setting: if a test there needs a browser, something has leaked out of
// @pg/runtime-browser. Only that package gets a DOM.
//
// Every project resolves workspace packages through the `@pg/source` condition, the same
// way the apps do, so tests run against sources rather than a build.
const sourceConditions = { conditions: ['@pg/source'] }

export default defineConfig({
  test: {
    projects: [
      {
        resolve: sourceConditions,
        test: {
          name: 'core',
          environment: 'node',
          include: ['packages/core/src/**/*.test.ts'],
        },
      },
      {
        resolve: sourceConditions,
        test: {
          name: 'providers',
          environment: 'node',
          include: ['packages/provider-*/src/**/*.test.ts'],
        },
      },
      {
        resolve: sourceConditions,
        test: {
          name: 'runtime-browser',
          environment: 'happy-dom',
          include: ['packages/runtime-browser/src/**/*.test.ts'],
        },
      },
    ],
  },
})
