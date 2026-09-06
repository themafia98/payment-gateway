import { createFileRoute, redirect } from '@tanstack/react-router'
import { SuccessState } from '@checkout-kit/ui'
import { Success } from '@/shared/ui'
import { TransactionDetails } from '@/entities/transaction'
import { DownloadReceipt } from '@/features/download-receipt'
import { ReturnToStoreButton } from '@/features/return-to-store'
import { paymentMethodLabel, toTransaction } from '@/features/checkout'
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
    const snapshot = context.checkout.getSnapshot()

    // The engine's copy is only trusted when it is both the same payment and already
    // settled; anything else is re-read from the provider. A half-finished intent left
    // over from a challenge would otherwise be mistaken for the outcome.
    const known = snapshot.intent
    const settled =
      known && known.id === deps.intentId && known.status === 'succeeded' ? known : null

    const intent: PaymentIntent | null =
      settled ?? (deps.intentId ? await context.checkout.fetchIntent(deps.intentId) : null)

    if (!intent || intent.status !== 'succeeded') {
      throw redirect({ to: '/summary/failure', search: { intentId: deps.intentId } })
    }

    return { intent }
  },
  component: SuccessPage,
})

function SuccessPage() {
  const { intent } = Route.useLoaderData()

  const merchant = useMerchant()

  const transaction = useMemo(
    () => toTransaction(intent, paymentMethodLabel(intent.providerId), merchant.name),
    [intent, merchant],
  )

  return (
    <SuccessState
      icon={<Success />}
      details={<TransactionDetails transaction={transaction} />}
      actions={
        <>
          <DownloadReceipt intentId={intent.id} />
          <ReturnToStoreButton />
        </>
      }
    >
      Thank you. Your payment has gone through and a receipt is on its way.
    </SuccessState>
  )
}
