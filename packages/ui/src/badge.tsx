import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface BadgeProps {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'success' | 'danger'
  className?: string
}

export const Badge = ({ children, tone = 'neutral', className }: BadgeProps): ReactElement => (
  <span className={cx('ck-badge', tone !== 'neutral' && `ck-badge--${tone}`, className)}>
    {children}
  </span>
)
