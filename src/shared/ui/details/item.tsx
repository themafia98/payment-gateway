import { useMemo } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary'

interface IProps {
  name: string
  value: string | number
  variant?: Variant
}

const variants: Record<NonNullable<IProps['variant']>, string> = {
  primary: 'text-[26px]',
  secondary: 'text-[32px]',
}

export const Item = ({ name, value, variant = 'primary' }: IProps) => {
  const textClassName = useMemo(() => cn('text-[16px] text-[#B0B0B0]', variants[variant]), [])

  return (
    <div className="flex justify-between gap-15.5">
      <p className={textClassName}>{name}</p>
      <p className={textClassName}>{value}</p>
    </div>
  )
}
