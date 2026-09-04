import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface TabsProps {
  children: ReactNode
  className?: string
  'aria-label'?: string
}

export const Tabs = ({ children, className, ...aria }: TabsProps): ReactElement => (
  <div role="tablist" className={cx('pg-tabs', className)} {...aria}>
    {children}
  </div>
)

export interface TabProps {
  children: ReactNode
  isActive: boolean
  onClick: () => void
  disabled?: boolean
  className?: string
}

export const Tab = ({
  children,
  isActive,
  onClick,
  disabled = false,
  className,
}: TabProps): ReactElement => (
  <button
    type="button"
    role="tab"
    aria-selected={isActive}
    aria-disabled={disabled}
    onClick={disabled ? undefined : onClick}
    className={cx('pg-tab', className)}
  >
    {children}
  </button>
)
