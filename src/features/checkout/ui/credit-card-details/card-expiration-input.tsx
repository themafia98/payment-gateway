import { Input } from '@/shared/ui'
import { formatCardExpiration } from '@/shared/lib'
import { type ChangeEventHandler, type Ref, useCallback, useMemo } from 'react'

interface IProps {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  name: string
  ref: Ref<HTMLInputElement>
}

export const CardExpirationInput = ({ value: inputValue, onChange, onBlur, name, ref }: IProps) => {
  const value = useMemo(() => formatCardExpiration(inputValue), [inputValue])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const value = formatCardExpiration(event.target.value)

      onChange(value)
    },
    [onChange],
  )

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="cc-exp"
      placeholder="MM / YYYY"
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
      name={name}
      ref={ref}
    />
  )
}
