import { createFileRoute } from '@tanstack/react-router'
import { CheckoutForm } from '../features/checkout/ui/checkout-form'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <main className="min-h-svh bg-linear-to-br from-[#06040a] via-[#10091c] to-[#2a0f46]">
      <CheckoutForm />
    </main>
  )
}
