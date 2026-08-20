import { createFileRoute } from '@tanstack/react-router'
import { PaymentResultHeader } from '@/widgets/payment-result-header'
import { TransactionDetails, type Transaction } from '@/entities/transaction'
import { DownloadReceipt } from '@/features/download-receipt'
import { ReturnToStoreButton } from '@/features/return-to-store'

export const Route = createFileRoute('/summary/success/')({
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
  return (
    <>
      <PaymentResultHeader isSuccess={true} />

      <TransactionDetails transaction={transaction} />

      <section className="space-y-4">
        <DownloadReceipt />
        <ReturnToStoreButton />
      </section>
    </>
  )
}
