import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef } from 'react'
import { ThreeDSChallenge } from '@/features/checkout'
import { createHttpPaymentGatewayAdapter, type PaymentResult } from '@/entities/payment'

export const Route = createFileRoute('/3ds/challenge/$challengeId')({
  component: ThreeDSPage,
})

function ThreeDSPage() {
  const { challengeId } = Route.useParams()
  const navigate = useNavigate()

  // Same adapter/port as checkout — the 3DS page is just another driving side.
  const gatewayRef = useRef(createHttpPaymentGatewayAdapter())

  // ACS verdict (via postMessage inside ThreeDSChallenge) -> settle against the
  // backend (source of truth) -> navigate. Navigation is delivery, so it lives here.
  const handleCres = (outcome: 'success' | 'fail') => {
    gatewayRef.current
      .authenticate(challengeId, outcome)
      .then((result: PaymentResult) =>
        result.status === 'succeeded'
          ? navigate({ to: '/summary/success', search: { intentId: result.intent.id } })
          : navigate({ to: '/summary/failure' }),
      )
      .catch(() => navigate({ to: '/summary/failure' }))
  }

  return <ThreeDSChallenge challengeId={challengeId} onCres={handleCres} />
}
