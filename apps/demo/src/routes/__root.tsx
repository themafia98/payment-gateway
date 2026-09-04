import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Main } from '@/shared/ui'
import { Merchant, MerchantProvider, type MerchantConfig } from '@/entities/merchant'
import type { PaymentIntent, PaymentResult } from '@/entities/payment'
import type { Plan } from '@/entities/plan'

// Dependencies the composition root (app/providers/router) injects. Routes name
// what they need and depend on this shape only — never on a concrete adapter, so
// nothing below this file knows that the transport happens to be HTTP.
export interface RouterContext {
  getMerchantConfig: () => Promise<MerchantConfig>
  getPlans: () => Promise<Plan[]>
  getPaymentIntent: (intentId: string) => Promise<PaymentIntent>
  authenticate3ds: (challengeId: string, outcome: 'success' | 'fail') => Promise<PaymentResult>
}

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: ({ context }) => context.getMerchantConfig(),
  component: RootComponent,
})

function RootComponent() {
  const merchant = Route.useLoaderData()

  return (
    <MerchantProvider value={merchant}>
      <Main>
        <Merchant />
        <Outlet />
        <TanStackRouterDevtools />
      </Main>
    </MerchantProvider>
  )
}
