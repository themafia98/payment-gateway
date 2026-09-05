import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface ErrorTextProps {
  children?: ReactNode
  className?: string
}

/**
 * What went wrong, in the shopper's terms. Always rendered as an alert, so a decline is
 * announced rather than merely displayed - and collapsed when empty, so it takes no room
 * until there is something to say.
 */
export const ErrorText = ({ children, className }: ErrorTextProps): ReactElement => (
  <p role="alert" className={cx('pg-error', className)}>
    {children}
  </p>
)

export interface StatusProps {
  children: ReactNode
  tone?: 'success' | 'failure' | 'neutral'
  className?: string
}

export const Status = ({ children, tone = 'neutral', className }: StatusProps): ReactElement => (
  <p className={cx('pg-status', tone !== 'neutral' && `pg-status--${tone}`, className)}>
    {children}
  </p>
)
