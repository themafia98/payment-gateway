import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { createGetMerchantConfig, createHttpMerchantGatewayAdapter } from '@/entities/merchant'
import { createGetPaymentIntent, createHttpPaymentGatewayAdapter } from '@/entities/payment'
import { createGetPlans, createHttpPlanGatewayAdapter } from '@/entities/plan'
import { createAuthenticate3ds } from '@/features/checkout'
import { Pending } from '@/shared/ui'

// Composition root: the only place ports meet concrete adapters. One gateway
// instance is shared by the payment use-cases so they talk to the same client.
const paymentGateway = createHttpPaymentGatewayAdapter()

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
  context: {
    getMerchantConfig: createGetMerchantConfig(createHttpMerchantGatewayAdapter()),
    getPlans: createGetPlans(createHttpPlanGatewayAdapter()),
    getPaymentIntent: createGetPaymentIntent(paymentGateway),
    authenticate3ds: createAuthenticate3ds(paymentGateway),
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
