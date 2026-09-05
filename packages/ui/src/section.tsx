import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface SectionProps {
  children: ReactNode
  className?: string
}

/** A group of related controls. The kit's only layout opinion. */
export const Section = ({ children, className }: SectionProps): ReactElement => (
  <section className={cx('pg-section', className)}>{children}</section>
)
