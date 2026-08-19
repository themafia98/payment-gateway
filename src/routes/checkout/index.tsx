import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/checkout/')({
  component: CheckoutPage,
})

function CheckoutPage() {
  return <h3 className="text-2xl">Payment Gateway - Checkout</h3>
}
