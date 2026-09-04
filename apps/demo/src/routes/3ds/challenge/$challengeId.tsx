import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PaymentActionHost } from '@pg/react'
import type { PaymentResult } from '@/entities/payment'

// The page an authentication step is shown on. It contains no protocol: the engine holds
// the action the provider asked for, and this route only decides where it renders and
// where the shopper goes afterwards.

interface ChallengeSearch {
  intentId?: string
}

export const Route = createFileRoute('/3ds/challenge/$challengeId')({
  validateSearch: (search: Record<string, unknown>): ChallengeSearch => ({
    intentId: typeof search.intentId === 'string' ? search.intentId : undefined,
  }),
  component: ThreeDSPage,
})

function ThreeDSPage() {
  const { intentId } = Route.useSearch()
  const { checkout } = Route.useRouteContext()
  const navigate = useNavigate()

  const handleSettled = (result: PaymentResult) => {
    if (result.status === 'succeeded') {
      void navigate({ to: '/summary/success', search: { intentId: result.intent.id } })
      return
    }
    void navigate({ to: '/summary/failure', search: { intentId } })
  }

  return (
    <div className="flex flex-col items-center gap-3 p-2">
      <PaymentActionHost
        onSettled={handleSettled}
        className="h-[70svh] w-full max-w-full overflow-hidden rounded-xl border border-[#2e303a] bg-white"
      />

      {/* Some banks would rather own the whole window. Same action, different surface -
          the provider is not asked twice and knows nothing about the choice. */}
      <button
        type="button"
        onClick={() => void checkout.runPendingAction({ surface: 'top' })}
        className="text-sm text-purple-300 underline"
      >
        Open bank in this window (full-page redirect)
      </button>
    </div>
  )
}
