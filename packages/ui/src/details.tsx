import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface DetailsProps {
  children: ReactNode
  className?: string
}

/** A list of name/value lines: an invoice, a receipt, a summary of a transaction. */
export const Details = ({ children, className }: DetailsProps): ReactElement => (
  <dl className={cx('pg-details', className)}>{children}</dl>
)

export interface ItemProps {
  name: string
  value: ReactNode
  /** Marks the line that the others add up to. */
  total?: boolean
  className?: string
}

export const Item = ({ name, value, total = false, className }: ItemProps): ReactElement => (
  <div className={cx('pg-item', total && 'pg-item--total', className)}>
    <dt className="pg-item__name">{name}</dt>
    <dd className="pg-item__value">{value}</dd>
  </div>
)
