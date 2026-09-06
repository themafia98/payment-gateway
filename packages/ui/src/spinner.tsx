import type { ReactElement } from 'react'
import { cx } from './cx'

export interface SpinnerProps {
  size?: 'sm' | 'md'
  /** Leave unset inside something that already announces itself, or it is read twice. */
  label?: string
  className?: string
}

export const Spinner = ({ size = 'sm', label, className }: SpinnerProps): ReactElement => (
  <span
    className={cx('ck-spinner', size === 'md' && 'ck-spinner--md', className)}
    role={label ? 'status' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
  />
)
