import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface IProps {
  children: string | ReactNode
  center?: boolean
  column?: boolean
}

export const Header = ({ children, center = false, column = false }: IProps) => {
  return (
    <header className={cn('flex relative', { 'items-center': center, 'flex-col': column })}>
      {children}
    </header>
  )
}
