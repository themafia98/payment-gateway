import type { ReactElement } from 'react'
import type { PaymentUiState } from '@checkout-kit/core'
import { Button, type ButtonProps } from './button'

const BUSY: readonly PaymentUiState[] = ['submitting', 'processing', 'requires_action']

export interface PaymentButtonProps extends Omit<ButtonProps, 'busy' | 'children'> {
  state: PaymentUiState
  children: ButtonProps['children']
  /** Shown after the label, e.g. the total. Keeps the amount in front of the shopper. */
  amount?: string
}

export const PaymentButton = ({
  state,
  children,
  amount,
  type = 'submit',
  ...props
}: PaymentButtonProps): ReactElement => (
  <Button {...props} type={type} busy={BUSY.includes(state)}>
    {children}
    {amount ? <span className="ck-payment-button__amount">{amount}</span> : null}
  </Button>
)
