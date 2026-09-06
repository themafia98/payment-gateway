import { Details, Item, Status } from '@checkout-kit/ui'
import type { Transaction } from '../model/transaction'

interface IProps {
  transaction: Transaction
  errorMessage?: string
}

export const TransactionDetails = ({ transaction, errorMessage }: IProps) => (
  <div className="ck-receipt">
    <Details>
      <Item name="Amount" value={transaction.amount} />
      <Item name="Transaction ID" value={transaction.id} />
      <Item name="Payment method" value={transaction.paymentMethod} />
      <Item name="Merchant" value={transaction.merchant} />
    </Details>
    {errorMessage ? <Status tone="failure">{errorMessage}</Status> : null}
  </div>
)
