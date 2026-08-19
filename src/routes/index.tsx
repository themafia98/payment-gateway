import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return <h3 className="text-2xl">Payment Gateway</h3>
}
