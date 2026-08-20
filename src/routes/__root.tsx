import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Main } from '@/shared/ui'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <Main>
      <Outlet />
      <TanStackRouterDevtools />
    </Main>
  )
}
