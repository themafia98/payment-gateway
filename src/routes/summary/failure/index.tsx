import { createFileRoute } from '@tanstack/react-router'
import { PaymentResultHeader } from '@/widgets/payment-result-header'
import { TransactionDetails, type Transaction } from '@/entities/transaction'
import { RetryPayment } from '@/features/retry-payment'

export const Route = createFileRoute('/summary/failure/')({
  component: FailurePage,
})

// TODO: test
const transaction: Transaction = {
  id: 'TXN-789123456',
  amount: '$100.00',
  paymentMethod: 'Bank Transfer',
  date: '04/2026',
  merchant: 'Store',
  error: true,
}

function FailurePage() {
  return (
    <>
      <PaymentResultHeader />

      <TransactionDetails transaction={transaction} />

      <RetryPayment />
    </>
  )
}
