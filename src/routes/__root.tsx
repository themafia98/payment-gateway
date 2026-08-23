import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Main } from '@/shared/ui'
import { Merchant, MerchantProvider, type MerchantConfig } from '@/entities/merchant'

// Dependencies the composition root (app/providers/router) injects. Routes depend
// on this shape, never on a concrete adapter — swapping HTTP for a fake is one line
// there, and loaders stay free of transport details.
export interface RouterContext {
  merchant: () => Promise<MerchantConfig>
}

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: ({ context }) => context.merchant(),
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
