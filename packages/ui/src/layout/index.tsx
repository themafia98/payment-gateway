import type { FormEvent, ReactElement, ReactNode } from 'react'
import { cx } from '../cx'

export interface CheckoutLayoutProps {
  children: ReactNode
  /** Above the form when narrow, beside it when there is room. */
  aside?: ReactNode
  className?: string
}

export const CheckoutLayout = ({
  children,
  aside,
  className,
}: CheckoutLayoutProps): ReactElement => (
  // Aside first in the DOM: on a phone a total belongs above the form, and the grid moves
  // it to the side when there is room.
  <div className={cx('ck-checkout', aside && 'ck-checkout--with-aside', className)}>
    {aside ? <aside className="ck-checkout__aside">{aside}</aside> : null}
    <div className="ck-checkout__main">{children}</div>
  </div>
)

export interface CheckoutFormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  /** The pay button and anything beside it. */
  actions?: ReactNode
  className?: string
}

export const CheckoutForm = ({
  onSubmit,
  children,
  actions,
  className,
}: CheckoutFormProps): ReactElement => (
  // noValidate: the browser bubbles cannot be styled, announced or translated.
  <form noValidate onSubmit={onSubmit} className={cx('ck-form', className)}>
    {children}
    {actions ? <div className="ck-form__actions">{actions}</div> : null}
  </form>
)

export interface StickyActionsProps {
  children: ReactNode
  className?: string
}

/** Sticky, not fixed: iOS mismeasures a fixed element once the keyboard is up. */
export const StickyActions = ({ children, className }: StickyActionsProps): ReactElement => (
  <div className={cx('ck-sticky-actions', className)}>{children}</div>
)
