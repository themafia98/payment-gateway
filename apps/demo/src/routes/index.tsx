import { createFileRoute } from '@tanstack/react-router'
import { PaymentForm } from '@/features/checkout'
import { ProviderSelector } from '@/features/select-payment-provider'

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.getPlans(),
  component: Index,
})

function Index() {
  const plans = Route.useLoaderData()

  // The acquirer switch is demo scaffolding, so it sits in the header slot rather than
  // pretending to be part of the checkout.
  return <PaymentForm plans={plans} header={<ProviderSelector />} />
}
