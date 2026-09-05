import { useEffect, useRef, type ReactElement, type ReactNode } from 'react'
import { cx } from '../cx'

export interface PaymentStateScreenProps {
  heading: ReactNode
  children?: ReactNode
  /** A summary, a receipt, the reason it failed. */
  details?: ReactNode
  /** Buttons: try again, go back, download a receipt. */
  actions?: ReactNode
  icon?: ReactNode
  tone?: 'neutral' | 'success' | 'failure'
  /** Move focus here on arrival, so a screen reader starts at the answer. */
  autoFocus?: boolean
  className?: string
}

/** Shared shell for the screens below. */
export const PaymentStateScreen = ({
  heading,
  children,
  details,
  actions,
  icon,
  tone = 'neutral',
  autoFocus = false,
  className,
}: PaymentStateScreenProps): ReactElement => {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoFocus) root.current?.focus()
  }, [autoFocus])

  return (
    <div
      ref={root}
      tabIndex={-1}
      className={cx('ck-state', tone !== 'neutral' && `ck-state--${tone}`, className)}
    >
      {icon ? (
        <div className="ck-state__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h2 className="ck-state__heading">{heading}</h2>
      {children ? <p className="ck-state__body">{children}</p> : null}
      {details ? <div className="ck-state__details">{details}</div> : null}
      {actions ? <div className="ck-state__actions">{actions}</div> : null}
    </div>
  )
}
