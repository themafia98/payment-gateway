import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef } from 'react'
import { ThreeDSChallenge, createAuthenticate3ds } from '@/features/checkout'
import { createHttpPaymentGatewayAdapter, type PaymentResult } from '@/entities/payment'

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
  const navigate = useNavigate()

  const authenticate3ds = useRef(createAuthenticate3ds(createHttpPaymentGatewayAdapter()))

  // iframe mode: settle the verdict, then navigate. (Redirect mode uses /3ds/return.)
  const handleCres = (outcome: 'success' | 'fail') => {
    authenticate3ds
      .current(challengeId, outcome)
      .then((result: PaymentResult) =>
        result.status === 'succeeded'
          ? navigate({ to: '/summary/success', search: { intentId: result.intent.id } })
          : navigate({ to: '/summary/failure', search: { intentId } }),
      )
      .catch(() => navigate({ to: '/summary/failure', search: { intentId } }))
  }

  return <ThreeDSChallenge challengeId={challengeId} onCres={handleCres} intentId={intentId} />
}
