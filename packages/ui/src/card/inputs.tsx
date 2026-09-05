import type { ReactElement, ReactNode, Ref } from 'react'
import { cvcLengthsFor, formatCardNumber, formatExpiry, type CardBrand } from '@checkout-kit/core'
import { Input, type InputProps } from '../input'
import { MaskedInput, type MaskedInputProps } from './masked-input'
import { CardBrandIndicator } from './card-brand'

type FieldProps = Omit<MaskedInputProps, 'format'>

export interface CardNumberInputProps extends FieldProps {
  /** Optional scheme art; a text badge is shown when none is given. */
  icons?: Partial<Record<CardBrand, ReactNode>>
}

export const CardNumberInput = ({ value, icons, ...props }: CardNumberInputProps): ReactElement => (
  <div className="ck-card-number">
    {/* The brand is read from the digits being typed, not from the value one keystroke ago,
        or the grouping changes a character late. */}
    <MaskedInput
      {...props}
      value={value}
      format={(digits) => formatCardNumber(digits)}
      autoComplete="cc-number"
      enterKeyHint="next"
      placeholder={props.placeholder ?? '0000 0000 0000 0000'}
    />
    <span className="ck-card-number__brand">
      <CardBrandIndicator value={value} icons={icons} />
    </span>
  </div>
)

export const ExpiryInput = (props: FieldProps): ReactElement => (
  <MaskedInput
    {...props}
    format={formatExpiry}
    autoComplete="cc-exp"
    enterKeyHint="next"
    placeholder={props.placeholder ?? 'MM / YY'}
  />
)

export interface CvcInputProps extends FieldProps {
  /** Amex asks for four digits, everyone else for three. */
  brand?: CardBrand
}

export const CvcInput = ({ brand, ...props }: CvcInputProps): ReactElement => (
  <MaskedInput
    {...props}
    format={(digits) => digits.slice(0, Math.max(...cvcLengthsFor(brand)))}
    autoComplete="cc-csc"
    enterKeyHint="done"
    placeholder={props.placeholder ?? 'CVC'}
  />
)

export interface CardholderInputProps extends Omit<InputProps, 'ref'> {
  ref?: Ref<HTMLInputElement>
}

export const CardholderInput = (props: CardholderInputProps): ReactElement => (
  <Input
    {...props}
    autoComplete="cc-name"
    autoCapitalize="words"
    spellCheck={false}
    enterKeyHint="next"
    placeholder={props.placeholder ?? 'Name on card'}
  />
)
