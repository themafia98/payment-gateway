import { fileURLToPath, URL } from 'node:url'
import { defaultClientConditions, defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tanstackRouter from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Prod build is deployed under a sub-path on GitHub Pages, but the dev server
  // must serve from root: MSW registers its worker at `/mockServiceWorker.js`
  // and needs a root scope to intercept `/api/*` requests.
  base: command === 'build' ? '/payment-gateway/' : '/',
  plugins: [tailwindcss(), tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
  resolve: {
    // Workspace packages are consumed through their real exports map, not a path alias:
    // the `@checkout-kit/source` condition points at their TypeScript sources during development,
    // while `PG_USE_DIST=1` drops it so CI can prove the published `dist` entry points
    // resolve too. An alias would bypass the exports map and hide mistakes in it.
    conditions: process.env.PG_USE_DIST
      ? undefined
      : ['@checkout-kit/source', ...defaultClientConditions],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
