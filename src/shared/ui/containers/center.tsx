import type { ReactNode } from 'react'

interface IProps {
  children: ReactNode
}

export const Center = ({ children }: IProps) => (
  <div className="space-y-6 py-8 text-center">{children}</div>
)
