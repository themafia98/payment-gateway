import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ThreeDSChallenge } from '@/features/checkout'
import type { PaymentResult } from '@/entities/payment'

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
  const { challengeId } = Route.useParams()
  const { intentId } = Route.useSearch()
  const { authenticate3ds } = Route.useRouteContext()
  const navigate = useNavigate()

  // iframe mode: settle the verdict, then navigate. (Redirect mode uses /3ds/return.)
  const handleCres = (outcome: 'success' | 'fail') => {
    authenticate3ds(challengeId, outcome)
      .then((result: PaymentResult) =>
        result.status === 'succeeded'
          ? navigate({ to: '/summary/success', search: { intentId: result.intent.id } })
          : navigate({ to: '/summary/failure', search: { intentId } }),
      )
      .catch(() => navigate({ to: '/summary/failure', search: { intentId } }))
  }

  return <ThreeDSChallenge challengeId={challengeId} onCres={handleCres} intentId={intentId} />
}
