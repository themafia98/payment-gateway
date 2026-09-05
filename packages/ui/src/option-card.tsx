// Real radio buttons, hidden and styled through `:has(:checked)`, so arrow keys and
// screen-reader announcement come from the browser instead of being reimplemented.

import { createContext, useContext, useId, type ReactElement, type ReactNode } from 'react'
import { cx } from './cx'

interface OptionCardGroupContext {
  readonly name: string
  readonly value: string | null
  readonly onChange: (value: string) => void
  readonly disabled: boolean
}

const GroupContext = createContext<OptionCardGroupContext | null>(null)

export interface OptionCardGroupProps {
  /** Rendered as the legend. */
  label: ReactNode
  value: string | null
  onChange: (value: string) => void
  children: ReactNode
  /** Shared radio name; generated when not given. */
  name?: string
  disabled?: boolean
  /** Only when a heading already asks the question. */
  hideLabel?: boolean
  className?: string
}

export const OptionCardGroup = ({
  label,
  value,
  onChange,
  children,
  name,
  disabled = false,
  hideLabel = false,
  className,
}: OptionCardGroupProps): ReactElement => {
  const generated = useId()

  return (
    <GroupContext value={{ name: name ?? generated, value, onChange, disabled }}>
      <fieldset className={cx('ck-option-group', className)}>
        <legend className={cx('ck-option-group__legend', hideLabel && 'ck-visually-hidden')}>
          {label}
        </legend>
        <div className="ck-option-group__items">{children}</div>
      </fieldset>
    </GroupContext>
  )
}

export interface OptionCardProps {
  value: string
  label: ReactNode
  description?: ReactNode
  badge?: ReactNode
  media?: ReactNode
  /** End of the row: a price, a card's last four. */
  aside?: ReactNode
  disabled?: boolean
  className?: string
}

export const OptionCard = ({
  value,
  label,
  description,
  badge,
  media,
  aside,
  disabled = false,
  className,
}: OptionCardProps): ReactElement => {
  const group = useContext(GroupContext)
  if (!group) {
    throw new Error('<OptionCard> must be used inside an <OptionCardGroup>.')
  }

  const isDisabled = disabled || group.disabled

  return (
    <label className={cx('ck-option', isDisabled && 'ck-option--disabled', className)}>
      <input
        className="ck-option__input"
        type="radio"
        name={group.name}
        value={value}
        checked={group.value === value}
        disabled={isDisabled}
        onChange={() => group.onChange(value)}
      />
      <span className="ck-option__marker" aria-hidden="true" />
      {media ? <span className="ck-option__media">{media}</span> : null}
      <span className="ck-option__body">
        <span className="ck-option__label">
          {label}
          {badge ? <span className="ck-badge">{badge}</span> : null}
        </span>
        {description ? <span className="ck-option__description">{description}</span> : null}
      </span>
      {aside ? <span className="ck-option__aside">{aside}</span> : null}
    </label>
  )
}
