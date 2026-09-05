import { createFileRoute, redirect } from '@tanstack/react-router'
import { FailureState } from '@checkout-kit/ui'
import { Failure } from '@/shared/ui'
import { TransactionDetails } from '@/entities/transaction'
import { RetryPayment } from '@/features/retry-payment'
import { paymentMethodLabel, toTransaction } from '@/features/checkout'
import type { PaymentIntent } from '@/entities/payment'
import { useMerchant } from '@/entities/merchant'
import { useMemo } from 'react'

interface FailureSearch {
  intentId?: string
}

export const Route = createFileRoute('/summary/failure/')({
  validateSearch: (search: Record<string, unknown>): FailureSearch => ({
    intentId: typeof search.intentId === 'string' ? search.intentId : undefined,
  }),
  loaderDeps: ({ search }) => ({ intentId: search.intentId }),
  loader: async ({ context, deps }) => {
    const snapshot = context.checkout.getSnapshot()

    const known = snapshot.intent?.id === deps.intentId ? snapshot.intent : null

    const intent: PaymentIntent | null =
      known ?? (deps.intentId ? await context.checkout.fetchIntent(deps.intentId) : null)

    if (!intent) {
      throw redirect({ to: '/' })
    }

    // The decline message comes from the engine, which got it from the issuer. After a
    // full-page redirect there is nothing left in memory, so the page shows the status
    // alone rather than inventing a reason.
    return { intent, error: snapshot.error }
  },
  component: FailurePage,
})

function FailurePage() {
  const { intent, error } = Route.useLoaderData()

  const merchant = useMerchant()

  const transaction = useMemo(
    () => toTransaction(intent, paymentMethodLabel(intent.providerId), merchant.name),
    [intent, merchant],
  )

  return (
    <FailureState
      tone={intent.status === 'canceled' ? 'cancelled' : 'declined'}
      icon={<Failure />}
      details={<TransactionDetails transaction={transaction} />}
      actions={<RetryPayment />}
    >
      {error?.message ?? 'The payment was not completed. Nothing has been charged.'}
    </FailureState>
  )
}
