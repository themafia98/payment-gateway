import type { ReactNode } from 'react'
import { CheckoutLayout } from '@checkout-kit/ui'

interface IProps {
  children: ReactNode
}

// Layout only - the gradient surface lives on #root so it also backs the router pending
// and error screens, which render before this component mounts.
export const Main = ({ children }: IProps) => (
  <main className="flex flex-1 flex-col px-4 py-6">
    <CheckoutLayout>{children}</CheckoutLayout>
  </main>
)
