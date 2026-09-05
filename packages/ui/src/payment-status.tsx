import type { ReactElement } from 'react'
import type { PaymentUiState } from '@checkout-kit/core'
import { cx } from './cx'
import { PAYMENT_STATUS_MESSAGES, SILENT_STATES, type PaymentStatusMessages } from './messages'

export interface PaymentStatusProps {
  state: PaymentUiState
  /** Replaces the default line, e.g. with the issuer's own decline message. */
  message?: string
  messages?: Partial<PaymentStatusMessages>
  className?: string
}

/**
 * The one live region on a checkout. Everything else - field errors, hints - stays quiet so
 * that what happens to the money is what gets read out.
 */
export const PaymentStatus = ({
  state,
  message,
  messages,
  className,
}: PaymentStatusProps): ReactElement => {
  const copy = { ...PAYMENT_STATUS_MESSAGES, ...messages }
  const text = SILENT_STATES.includes(state)
    ? ''
    : (message ?? copy[state as keyof PaymentStatusMessages])

  const tone =
    state === 'success'
      ? 'success'
      : state === 'failure' || state === 'cancelled'
        ? 'failure'
        : null

  return (
    <p
      role="status"
      aria-live="polite"
      className={cx('ck-payment-status', tone && `ck-payment-status--${tone}`, className)}
    >
      {text}
    </p>
  )
}
