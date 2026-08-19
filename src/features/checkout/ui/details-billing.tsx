import type { Invoice } from '../../../entities/invoice/types/invoice'
import { Details } from '../../../shared/ui/details/details'
import { Item } from '../../../shared/ui/details/item'

interface IProps {
  invoice: Invoice
}

export const DetailsBilling = ({ invoice }: IProps) => {
  return (
    <Details>
      <Item name="Price" value={`${invoice.currency}${invoice.subtotal}`} />
      {!!invoice.discount && <Item name="Discount" value={invoice.discount} />}
      <Item name="Total due" variant="secondary" value={`${invoice.currency}${invoice.total}`} />
    </Details>
  )
}
