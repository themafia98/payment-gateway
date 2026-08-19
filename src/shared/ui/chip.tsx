import { cn } from '../lib/cn'

type Variant = 'primary' | 'secondary'

interface IProps {
  variant?: Variant
  children: string
}

const variants = {
  primary: 'bg-[#dad2ff] text-black',
  secondary: 'bg-white text-black',
}

export const Chip = ({ children, variant = "primary" }: IProps) => {
  return (
    <div
      className={cn(
        'flex h-[27.1px] w-[63.5px] flex-row items-center justify-center rounded-[70.5px] px-[10.3px] py-[2.6px]',
        variants[variant],
      )}
    >
      {children}
    </div>
  )
}
