import { createFileRoute } from '@tanstack/react-router'
import { CheckoutForm } from '@/features/checkout'

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.getPlans(),
  component: Index,
})

function Index() {
  const plans = Route.useLoaderData()
  return <CheckoutForm plans={plans} />
}
