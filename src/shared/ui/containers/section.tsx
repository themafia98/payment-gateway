import type { ReactNode } from 'react'

interface IProps {
  children?: ReactNode[] | ReactNode
}

export const Section = ({ children }: IProps) => (
  <section className="flex flex-col gap-4">{children}</section>
)
