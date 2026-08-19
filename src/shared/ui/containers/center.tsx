import type { ReactNode } from 'react'

interface IProps {
  children: ReactNode
}

export const Center = ({ children }: IProps) => (
  <div className="p-8 text-center space-y-6 min-h-svh gap-6">{children}</div>
)
