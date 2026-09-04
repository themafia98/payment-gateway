import type { ReactNode } from 'react'

interface ErrorTextProps {
  children?: ReactNode
}

export const ErrorText = ({ children }: ErrorTextProps) =>
  children ? (
    <p role="alert" className="text-sm text-red-500">
      {children}
    </p>
  ) : null
