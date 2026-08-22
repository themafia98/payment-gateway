import { createFileRoute } from '@tanstack/react-router'
import { PaymentResultHeader } from '@/widgets/payment-result-header'
import { TransactionDetails, type Transaction } from '@/entities/transaction'
import { DownloadReceipt } from '@/features/download-receipt'
import { ReturnToStoreButton } from '@/features/return-to-store'

interface SuccessSearch {
  intentId?: string
}

export const Route = createFileRoute('/summary/success/')({
  // Typed, validated search params. `intentId` arrives in the URL so the page is
  // self-contained and survives a reload (an in-memory store would lose it on F5).
  validateSearch: (search: Record<string, unknown>): SuccessSearch => ({
    intentId: typeof search.intentId === 'string' ? search.intentId : undefined,
  }),
  component: SuccessPage,
})

// TODO: test
const transaction: Transaction = {
  id: 'TXN-789123456',
  amount: '$100.00',
  paymentMethod: 'Bank Transfer',
  date: '04/2026',
  merchant: 'Store',
}

function SuccessPage() {
  const { intentId } = Route.useSearch()

  return (
    <>
      <PaymentResultHeader isSuccess={true} />

      <TransactionDetails transaction={transaction} />

      <section className="space-y-4">
        <DownloadReceipt intentId={intentId} />
        <ReturnToStoreButton />
      </section>
    </>
  )
}
