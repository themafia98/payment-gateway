import type { ReactNode } from 'react'

interface IProps {
  children: ReactNode
}

// Padding only. The column is the page's business: the checkout wants a summary beside it,
// a receipt does not.
export const Main = ({ children }: IProps) => (
  <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
)
