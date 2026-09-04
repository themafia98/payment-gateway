import { createFileRoute, redirect } from '@tanstack/react-router'
import { PaymentResultHeader } from '@/widgets/payment-result-header'
import { TransactionDetails } from '@/entities/transaction'
import { RetryPayment } from '@/features/retry-payment'
import { toTransaction, useCheckoutStore } from '@/features/checkout'
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
    const state = useCheckoutStore.getState()

    const isSameIntent = state.intent?.id === deps.intentId

    let intent: PaymentIntent | null = isSameIntent ? state.intent : null

    if (!isSameIntent && deps.intentId) {
      intent = await context.getPaymentIntent(deps.intentId)
    }

    if (!intent) {
      throw redirect({ to: '/' })
    }

    return { intent, method: state.method, error: state.error }
  },
  component: FailurePage,
})

function FailurePage() {
  const { intent, method, error } = Route.useLoaderData()

  const merchant = useMerchant()

  const transaction = useMemo(
    () => toTransaction(intent, method, merchant.name),
    [intent, method, merchant],
  )

  return (
    <>
      <PaymentResultHeader />

      <TransactionDetails transaction={transaction} errorMessage={error?.message} />

      <RetryPayment />
    </>
  )
}
