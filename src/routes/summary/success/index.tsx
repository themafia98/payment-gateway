import { createFileRoute } from '@tanstack/react-router'
import { PaymentResultHeader } from '../../../widgets/payment-result-header/payment-result-header.tsx'
import { TransactionDetails } from '../../../entities/transaction/ui/transaction-details.tsx'
import type { Transaction } from '../../../entities/transaction/model/transaction.ts'
import { DownloadReceipt } from '../../../features/download-receipt/ui/download-receipt.tsx'
import { ReturnToStoreButton } from '../../../features/return-to-store/ui/return-to-store-button.tsx'

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
