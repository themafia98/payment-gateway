import { Input } from '@/shared/ui'
import { formatCardNumber, normalizeCardNumber } from '@/shared/lib'
import { type ChangeEventHandler, type Ref, useCallback, useMemo } from 'react'

interface IProps {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  name: string
  ref: Ref<HTMLInputElement>
}

export const CreditCardInput = ({ value: inputValue, onChange, onBlur, name, ref }: IProps) => {
  const value = useMemo(() => formatCardNumber(inputValue), [inputValue])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const value = normalizeCardNumber(event.target.value).slice(0, 16)

      onChange(value)
    },
    [onChange],
  )

  return (
    <Input
      type="text"
      autoComplete="cc-number"
      inputMode="numeric"
      placeholder="0000 0000 0000 0000"
      maxLength={19}
      value={formatCardNumber(value)}
      onChange={handleChange}
      onBlur={onBlur}
      name={name}
      ref={ref}
    />
  )
}
