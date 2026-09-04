import type { ButtonHTMLAttributes, ReactElement } from 'react'
import { cn } from '../lib/cn'
import type { ClassValue } from 'clsx'

interface IProps {
  children: string
  type: ButtonHTMLAttributes<HTMLButtonElement>['type']
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
  variant?: 'primary' | 'secondary'
  className?: ClassValue
  leftIcon?: ReactElement
  rightIcon?: ReactElement
  disabled?: boolean
}

const variants: Record<NonNullable<IProps['variant']>, string> = {
  primary:
    'text-white bg-purple-500 shadow-[inset_5.205977439880371px_6.941303253173828px_36.61537551879883px_rgba(255,255,255,0.25)]',
  secondary: 'text-white bg-purple-500/50',
}

export const Button = ({
  children,
  type,
  onClick,
  className,
  disabled,
  leftIcon,
  rightIcon,
  variant = 'primary',
}: IProps) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full h-22 cursor-pointer items-center justify-center rounded-[14px] px-8 py-0 text-xl font-medium',
        variants[variant],
        className,
      )}
    >
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      <p data-name="Continue payment" className="text-[#E9E9E9]">
        {children}
      </p>
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  )
}
