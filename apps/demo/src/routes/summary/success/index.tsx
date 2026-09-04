import { createFileRoute, redirect } from '@tanstack/react-router'
import { PaymentResultHeader } from '@/widgets/payment-result-header'
import { TransactionDetails } from '@/entities/transaction'
import { DownloadReceipt } from '@/features/download-receipt'
import { ReturnToStoreButton } from '@/features/return-to-store'
import { toTransaction, useCheckoutStore } from '@/features/checkout'
import type { PaymentIntent } from '@/entities/payment'
import { useMemo } from 'react'
import { useMerchant } from '@/entities/merchant'

interface SuccessSearch {
  intentId?: string
}

export const Route = createFileRoute('/summary/success/')({
  // Typed, validated search params. `intentId` arrives in the URL so the page is
  // self-contained and survives a reload (an in-memory store would lose it on F5).
  validateSearch: (search: Record<string, unknown>): SuccessSearch => ({
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

    if (!intent || intent.status !== 'succeeded') {
      throw redirect({ to: '/summary/failure', search: { intentId: deps.intentId } })
    }

    return { intent, method: state.method }
  },
  component: SuccessPage,
})

function SuccessPage() {
  const { intent, method } = Route.useLoaderData()

  const merchant = useMerchant()

  const transaction = useMemo(
    () => toTransaction(intent, method, merchant.name),
    [intent, method, merchant],
  )

  return (
    <>
      <PaymentResultHeader isSuccess />
      <TransactionDetails transaction={transaction} />
      <section className="space-y-4">
        <DownloadReceipt intentId={intent.id} />
        <ReturnToStoreButton />
      </section>
    </>
  )
}
