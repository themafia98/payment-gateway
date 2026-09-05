import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Split by what each layer actually needs, not by folder.
//
// The core and the plugins run in Node with no DOM at all - which is a claim as much as a
// setting: if a test there needs a browser, something has leaked out of
// @pg/runtime-browser. Only that package gets a DOM.

const packageSource = (path: string) =>
  fileURLToPath(new URL(`./packages/${path}`, import.meta.url))

/**
 * Resolve workspace packages to their sources.
 *
 * The apps deliberately go through the real `exports` map instead, so that a broken one
 * fails rather than hides - but they are built by a bundler that can be told about a custom
 * condition. Vitest hands bare specifiers to Node, which cannot be, so it would quietly
 * resolve to whatever `dist` happened to be lying around: green locally, broken on a clean
 * checkout, and testing yesterday's build either way.
 *
 * Two rules cover it, because every subpath entry in this repo has the same shape. The
 * exports maps are still checked - by publint, by attw, and by the `verify:dist` job.
 */
const workspaceSources = {
  alias: [
    { find: /^@pg\/([^/]+)$/, replacement: packageSource('$1/src/index.ts') },
    { find: /^@pg\/([^/]+)\/(.+)$/, replacement: packageSource('$1/src/$2/index.ts') },
  ],
}

export default defineConfig({
  test: {
    projects: [
      {
        resolve: workspaceSources,
        test: {
          name: 'core',
          environment: 'node',
          include: ['packages/core/src/**/*.test.ts'],
        },
      },
      {
        resolve: workspaceSources,
        test: {
          name: 'providers',
          environment: 'node',
          include: ['packages/provider-*/src/**/*.test.ts'],
        },
      },
      {
        resolve: workspaceSources,
        test: {
          name: 'runtime-browser',
          environment: 'happy-dom',
          include: ['packages/runtime-browser/src/**/*.test.ts'],
        },
      },
    ],
  },
})
