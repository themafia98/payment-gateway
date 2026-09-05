// A labelled control with its hint and error wired to it. Every input goes through this.

import { useId, type ReactElement, type ReactNode } from 'react'
import { cx } from './cx'

/** Spread onto the control. */
export interface FieldControlProps {
  readonly id: string
  readonly 'aria-describedby': string | undefined
  readonly 'aria-invalid': true | undefined
  readonly required: boolean | undefined
}

export interface FieldProps {
  label: ReactNode
  children: (control: FieldControlProps) => ReactNode
  hint?: ReactNode
  /** Its presence is what marks the field invalid. */
  error?: ReactNode
  required?: boolean
  optionalText?: string
  className?: string
}

export const Field = ({
  label,
  children,
  hint,
  error,
  required,
  optionalText,
  className,
}: FieldProps): ReactElement => {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('ck-field', Boolean(error) && 'ck-field--invalid', className)}>
      <label className="ck-field__label" htmlFor={id}>
        {label}
        {!required && optionalText ? (
          <span className="ck-field__optional"> {optionalText}</span>
        ) : null}
      </label>

      {hint ? (
        <p className="ck-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}

      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        required: required || undefined,
      })}

      {/* Polite: the one assertive region on the page belongs to the payment. */}
      {error ? (
        <p className="ck-field__error" id={errorId} role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export interface FieldGroupProps {
  legend: ReactNode
  children: ReactNode
  /** Shown under the legend. */
  hint?: ReactNode
  className?: string
}

/** Fields that form one question: a billing address, a card. */
export const FieldGroup = ({
  legend,
  children,
  hint,
  className,
}: FieldGroupProps): ReactElement => (
  <fieldset className={cx('ck-fieldset', className)}>
    <legend className="ck-fieldset__legend">{legend}</legend>
    {hint ? <p className="ck-field__hint">{hint}</p> : null}
    {children}
  </fieldset>
)
