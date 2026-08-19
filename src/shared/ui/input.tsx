import type { DetailedHTMLProps, InputHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export const Input = ({
  className,
  ...props
}: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => {
  return (
    <input
      className={cn(
        'flex h-[66.6px] flex-1 flex-row items-center justify-between self-stretch rounded-[10.3px] bg-[#3d3d3d] px-4 text-white',
        className,
      )}
      type="text"
      {...props}
    />
  )
}
