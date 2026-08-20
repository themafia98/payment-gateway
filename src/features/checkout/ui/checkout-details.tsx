import type { Invoice } from '@/entities/invoice'
import { Details, Item } from '@/shared/ui'

interface IProps {
  invoice: Invoice
}

export const CheckoutDetails = ({ invoice }: IProps) => {
  return (
    <Details>
      <Item name="Price" value={`${invoice.currency}${invoice.subtotal}`} />
      {!!invoice.discount && <Item name="Discount" value={invoice.discount} />}
      <Item name="Total due" variant="secondary" value={`${invoice.currency}${invoice.total}`} />
    </Details>
  )
}
