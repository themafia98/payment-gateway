import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
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
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
