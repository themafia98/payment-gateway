import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface ButtonProps {
  children: ReactNode
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  className?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = ({
  children,
  type = 'button',
  onClick,
  variant = 'primary',
  disabled,
  className,
  leftIcon,
  rightIcon,
}: ButtonProps): ReactElement => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cx('pg-button', variant === 'secondary' && 'pg-button--secondary', className)}
  >
    {leftIcon}
    <span>{children}</span>
    {rightIcon}
  </button>
)
