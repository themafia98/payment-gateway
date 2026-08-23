import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { Center } from '@/shared/ui'
import type { PaymentResult } from '@/entities/payment'
import { createHttpPaymentGatewayAdapter } from '@/entities/payment'
import { createAuthenticate3ds } from '@/features/checkout'

// Return landing for redirect-mode 3DS. The bank sends the browser back with
// ?challengeId&transStatus (and our intentId). State is wiped by the reload, so
// everything rides in the URL; we settle against our backend, then move on.

interface ReturnSearch {
  intentId?: string
  challengeId?: string
  transStatus?: string
}

export const Route = createFileRoute('/3ds/return')({
  validateSearch: (search: Record<string, unknown>): ReturnSearch => ({
    intentId: typeof search.intentId === 'string' ? search.intentId : undefined,
    challengeId: typeof search.challengeId === 'string' ? search.challengeId : undefined,
    transStatus: typeof search.transStatus === 'string' ? search.transStatus : undefined,
  }),
  component: ThreeDSReturnPage,
})

function ThreeDSReturnPage() {
  const { intentId, challengeId, transStatus } = Route.useSearch()
  const navigate = useNavigate()
  const settled = useRef(false)

  useEffect(() => {
    if (settled.current) return // run once
    settled.current = true

    if (!challengeId) {
      navigate({ to: '/summary/failure', search: { intentId } })
      return
    }

    const authenticate3ds = createAuthenticate3ds(createHttpPaymentGatewayAdapter())

    authenticate3ds(challengeId, transStatus === 'Y' ? 'success' : 'fail')
      .then((result: PaymentResult) =>
        result.status === 'succeeded'
          ? navigate({ to: '/summary/success', search: { intentId } })
          : navigate({ to: '/summary/failure', search: { intentId } }),
      )
      .catch(() => navigate({ to: '/summary/failure', search: { intentId } }))
  }, [challengeId, transStatus, intentId, navigate])

  return (
    <Center>
      <p className="text-white">Finishing authentication…</p>
    </Center>
  )
}
