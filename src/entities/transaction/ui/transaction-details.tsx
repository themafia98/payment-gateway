import type { Transaction } from '../model/transaction'

interface IProps {
  transaction: Transaction
}

export const TransactionDetails = ({ transaction }: IProps) => (
  <div className="bg-[#3d3d3d] rounded-lg p-4 space-y-3">
    <div className="flex justify-between text-white items-center gap-2">
      <span>Amount</span>
      <span>{transaction.amount}</span>
    </div>
    <div className="flex justify-between text-white items-center gap-2">
      <span>Transaction ID</span>
      <span>{transaction.id}</span>
    </div>
    <div className="flex justify-between text-white items-center gap-2">
      <span>Payment Method</span>
      <span>{transaction.paymentMethod}</span>
    </div>
    {transaction?.error && (
      <div className="flex justify-between text-white items-center gap-2">
        <span>Status</span>
        <span className="text-red-400">Failed</span>
      </div>
    )}
    <div className="flex justify-between text-white items-center gap-2">
      <span>Date</span>
      <span>{transaction.date}</span>
    </div>
    <div className="flex justify-between text-white items-center gap-2">
      <span>Merchant</span>
      <span>{transaction.merchant}</span>
    </div>
  </div>
)
