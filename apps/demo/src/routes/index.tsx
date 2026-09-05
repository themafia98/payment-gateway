import { createFileRoute } from '@tanstack/react-router'
import { CheckoutForm } from '@/features/checkout'
import { ProviderSelector } from '@/features/select-payment-provider'
import { Section } from '@/shared/ui'

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.getPlans(),
  component: Index,
})

function Index() {
  const plans = Route.useLoaderData()

  // Two sibling features, composed by the route rather than importing each other.
  return (
    <>
      <Section>
        <ProviderSelector />
      </Section>
      <CheckoutForm plans={plans} />
    </>
  )
}
