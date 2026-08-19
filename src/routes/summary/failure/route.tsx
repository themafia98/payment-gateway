import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Center } from '../../../shared/ui/containers/center'

export const Route = createFileRoute('/summary/failure')({
  component: Layout,
})

function Layout() {
  return (
    <Center>
      <Outlet />
    </Center>
  )
}
