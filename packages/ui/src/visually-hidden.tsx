import type { ReactElement, ReactNode } from 'react'

export interface VisuallyHiddenProps {
  children: ReactNode
}

/** Read by a screen reader, not shown. */
export const VisuallyHidden = ({ children }: VisuallyHiddenProps): ReactElement => (
  <span className="ck-visually-hidden">{children}</span>
)
