import type { ReactNode } from 'react'

interface IProps {
  children: ReactNode[]
}

export const Details = ({ children }: IProps) => (
  <div className="flex h-25 flex-col gap-4">{children}</div>
)
