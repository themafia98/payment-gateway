import type { ButtonHTMLAttributes, ReactElement, ReactNode, Ref } from 'react'
import { cx } from './cx'
import { Spinner } from './spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  children: ReactNode
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  fullWidth?: boolean
  /** Shows a spinner and stops responding. Keeps the label: it is a moving target otherwise. */
  busy?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  className?: string
  ref?: Ref<HTMLButtonElement>
}

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  busy = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  onClick,
  ref,
  ...props
}: ButtonProps): ReactElement => (
  <button
    {...props}
    ref={ref}
    type={type}
    disabled={disabled}
    // Not `disabled`: that drops focus to the top of the page mid-payment.
    aria-disabled={busy || undefined}
    aria-busy={busy || undefined}
    onClick={busy ? undefined : onClick}
    className={cx(
      'ck-button',
      variant !== 'primary' && `ck-button--${variant}`,
      size === 'sm' && 'ck-button--sm',
      !fullWidth && 'ck-button--auto',
      className,
    )}
  >
    {busy ? <Spinner /> : leftIcon}
    <span>{children}</span>
    {rightIcon}
  </button>
)
