import type { ReactElement, ReactNode } from 'react'
import { cx } from '../cx'

export interface CardFieldsProps {
  /** Number and cardholder run full width; expiry and security code share a row when it fits. */
  children: ReactNode
  className?: string
}

export const CardFields = ({ children, className }: CardFieldsProps): ReactElement => (
  <div className={cx('ck-card-fields', className)}>{children}</div>
)

export interface CardFieldsRowProps {
  children: ReactNode
  className?: string
}

export const CardFieldsRow = ({ children, className }: CardFieldsRowProps): ReactElement => (
  <div className={cx('ck-card-fields__row', className)}>{children}</div>
)
