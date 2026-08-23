import type { ReactNode } from 'react'

interface IProps {
  children: ReactNode
}

// Layout only — the gradient surface lives on #root so it also backs the router's
// pending and error screens, which render before this component mounts.
export const Main = ({ children }: IProps) => {
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[620px] flex-col gap-6 px-5 py-8">{children}</div>
    </main>
  )
}
