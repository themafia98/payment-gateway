import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Split by what each layer needs. The core and the plugins run in Node with no DOM: if a
// test there needs a browser, something has leaked out of @checkout-kit/runtime-browser.

const packageSource = (path: string) =>
  fileURLToPath(new URL(`./packages/${path}`, import.meta.url))

/**
 * Resolve workspace packages to their sources.
 *
 * Vitest hands bare specifiers to Node, which knows nothing about our `@checkout-kit/source`
 * condition, so it would fall back to `dist` - passing locally and failing on a clean
 * checkout. The exports maps are still checked by publint, attw and the verify:dist job.
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
