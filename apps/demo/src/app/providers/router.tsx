import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { createGetMerchantConfig, createHttpMerchantGatewayAdapter } from '@/entities/merchant'
import { createGetPlans, createHttpPlanGatewayAdapter } from '@/entities/plan'
import { checkout } from './checkout'
import { connectCheckoutStore } from '@/features/checkout'
import { Pending } from '@/shared/ui'

// The app keeps its own store, and it follows the engine rather than competing with it.
// Subscribed once here, for the lifetime of the app.
connectCheckoutStore(checkout)

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

  // Checked against RouterContext through routeTree — a missing or mistyped
  // dependency fails the build, with no type import from the routes layer.
  //
  // The checkout engine travels as a whole rather than as a handful of unwrapped
  // callbacks: it is already the seam. Routes talk to `context.checkout` and never learn
  // which plugin, transport or authentication scheme is behind it.
  context: {
    getMerchantConfig: createGetMerchantConfig(createHttpMerchantGatewayAdapter()),
    getPlans: createGetPlans(createHttpPlanGatewayAdapter()),
    checkout,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
