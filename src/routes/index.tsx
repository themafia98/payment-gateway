import { createFileRoute } from '@tanstack/react-router'
import { CheckoutForm } from '@/features/checkout'
import { createHttpPlanGatewayAdapter } from '@/entities/plan'

export const Route = createFileRoute('/')({
  loader: () => createHttpPlanGatewayAdapter().getPlans(),
  component: Index,
})

function Index() {
  const plans = Route.useLoaderData()
  return <CheckoutForm plans={plans} />
}
