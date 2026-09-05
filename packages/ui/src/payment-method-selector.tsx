import type { ReactElement, ReactNode } from 'react'
import { OptionCard, OptionCardGroup } from './option-card'
import { Tab, Tabs } from './tabs'

export interface PaymentMethodOption {
  readonly id: string
  readonly label: string
  readonly description?: string
  readonly badge?: string
  readonly icon?: ReactNode
  readonly disabled?: boolean
}

export interface PaymentMethodSelectorProps {
  /** Supplied by the host: the kit has no opinion on which methods exist. */
  methods: readonly PaymentMethodOption[]
  value: string | null
  onChange: (id: string) => void
  label?: string
  /** `tabs` for a handful of methods, `list` when each needs a line of explanation. */
  layout?: 'list' | 'tabs'
  disabled?: boolean
  className?: string
}

export const PaymentMethodSelector = ({
  methods,
  value,
  onChange,
  label = 'Payment method',
  layout = 'list',
  disabled = false,
  className,
}: PaymentMethodSelectorProps): ReactElement =>
  layout === 'tabs' ? (
    <Tabs
      aria-label={label}
      value={value ?? ''}
      onValueChange={onChange}
      disabled={disabled}
      className={className}
    >
      {methods.map((method) => (
        <Tab key={method.id} value={method.id} disabled={method.disabled}>
          {method.label}
        </Tab>
      ))}
    </Tabs>
  ) : (
    <OptionCardGroup
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
    >
      {methods.map((method) => (
        <OptionCard
          key={method.id}
          value={method.id}
          label={method.label}
          description={method.description}
          badge={method.badge}
          media={method.icon}
          disabled={method.disabled}
        />
      ))}
    </OptionCardGroup>
  )
