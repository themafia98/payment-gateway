import type { ReactElement, ReactNode } from 'react'
import { ActionFrame, type ActionFrameVariant } from '../action-frame'
import { Spinner } from '../spinner'
import { PaymentStateScreen } from './payment-state'

export interface ProcessingStateProps {
  heading?: ReactNode
  children?: ReactNode
  actions?: ReactNode
}

export const ProcessingState = ({
  heading = 'Confirming your payment',
  children = 'This usually takes a few seconds. Do not close this page.',
  actions,
}: ProcessingStateProps): ReactElement => (
  <PaymentStateScreen heading={heading} actions={actions} icon={<Spinner size="md" />}>
    {children}
  </PaymentStateScreen>
)

export interface AuthenticationStateProps {
  /** Where the action renders. The host passes its mount point through. */
  children: ReactNode
  heading?: ReactNode
  description?: ReactNode
  variant?: ActionFrameVariant
  /** Usually a cancel button: there is always a way out. */
  actions?: ReactNode
}

export const AuthenticationState = ({
  children,
  heading = 'Confirm with your bank',
  description = 'Your bank is asking you to approve this payment.',
  variant = 'challenge',
  actions,
}: AuthenticationStateProps): ReactElement => (
  <PaymentStateScreen
    heading={heading}
    details={<ActionFrame variant={variant}>{children}</ActionFrame>}
    actions={actions}
  >
    {description}
  </PaymentStateScreen>
)

export interface SuccessStateProps {
  heading?: ReactNode
  children?: ReactNode
  details?: ReactNode
  actions?: ReactNode
  icon?: ReactNode
}

export const SuccessState = ({
  heading = 'Payment successful',
  children,
  details,
  actions,
  icon,
}: SuccessStateProps): ReactElement => (
  <PaymentStateScreen
    heading={heading}
    details={details}
    actions={actions}
    icon={icon}
    tone="success"
    autoFocus
  >
    {children}
  </PaymentStateScreen>
)

export type FailureTone = 'declined' | 'failed' | 'cancelled'

const HEADINGS: Record<FailureTone, string> = {
  declined: 'Payment declined',
  failed: 'Payment failed',
  cancelled: 'Payment cancelled',
}

export interface FailureStateProps {
  tone?: FailureTone
  heading?: ReactNode
  /** The issuer wording, when there is any: it is what the shopper repeats to their bank. */
  children?: ReactNode
  details?: ReactNode
  actions?: ReactNode
  icon?: ReactNode
}

export const FailureState = ({
  tone = 'failed',
  heading,
  children,
  details,
  actions,
  icon,
}: FailureStateProps): ReactElement => (
  <PaymentStateScreen
    heading={heading ?? HEADINGS[tone]}
    details={details}
    actions={actions}
    icon={icon}
    tone={tone === 'cancelled' ? 'neutral' : 'failure'}
    autoFocus
  >
    {children}
  </PaymentStateScreen>
)
