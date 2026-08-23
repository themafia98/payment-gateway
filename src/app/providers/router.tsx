import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { createGetMerchantConfig, createHttpMerchantGatewayAdapter } from '@/entities/merchant'
import { Pending } from '@/shared/ui'

// Composition root: the only place ports meet concrete adapters. `context` is
// type-checked against the root route's RouterContext through routeTree — no
// import from the routes layer needed, and a missing dependency fails the build.
export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
  defaultPreload: 'intent',
  scrollRestoration: true,

  // Loading feedback. The 1000ms default leaves the first paint blank for a full
  // second on a cold load; 250ms is past the "instant" threshold, so quick loads
  // still flash nothing, and pendingMinMs keeps the spinner from blinking when a
  // loader resolves right after it appears.
  defaultPendingComponent: Pending,
  defaultPendingMs: 250,
  defaultPendingMinMs: 400,

  context: {
    merchant: createGetMerchantConfig(createHttpMerchantGatewayAdapter()),
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
