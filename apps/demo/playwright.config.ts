import { defineConfig, devices } from '@playwright/test'
import type { CheckoutOptions } from './e2e/fixtures'

export default defineConfig<CheckoutOptions>({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  // The same specs, once per payment integration. Nothing in them mentions a provider:
  // if a test needed an `if` here, the abstraction would have failed.
  projects: [
    {
      name: 'psp',
      use: { ...devices['Desktop Chrome'], paymentProvider: 'psp' },
    },
    {
      name: 'acquiring',
      use: { ...devices['Desktop Chrome'], paymentProvider: 'acquiring' },
    },
    {
      name: 'hpp',
      use: { ...devices['Desktop Chrome'], paymentProvider: 'hpp' },
    },
    {
      name: 'hostedfields',
      use: { ...devices['Desktop Chrome'], paymentProvider: 'hostedfields' },
    },
    {
      name: 'wallet',
      use: { ...devices['Desktop Chrome'], paymentProvider: 'wallet' },
    },
  ],
  webServer: {
    command: 'npm run dev:mock',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
