import { createFileRoute } from '@tanstack/react-router'
import { CheckoutForm } from '../features/checkout/ui/checkout-form'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return <CheckoutForm />
}
