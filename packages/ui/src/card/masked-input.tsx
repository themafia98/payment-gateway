import { useLayoutEffect, useRef, type ChangeEvent, type ReactElement, type Ref } from 'react'
import { onlyDigits } from '@checkout-kit/core'
import { Input, type InputProps } from '../input'
import { caretAfterDigits, digitsBefore } from './caret'

export interface MaskedInputProps extends Omit<InputProps, 'onChange' | 'value' | 'ref'> {
  value: string
  onChange: (value: string) => void
  /** Turns digits into what is shown, and limits how many there can be. */
  format: (digits: string) => string
  ref?: Ref<HTMLInputElement>
}

/**
 * A digits-only input that reformats as you type without throwing the caret to the end.
 * Position is tracked by how many digits precede it, since the separators move.
 */
export const MaskedInput = ({
  value,
  onChange,
  format,
  ref,
  ...props
}: MaskedInputProps): ReactElement => {
  const inputRef = useRef<HTMLInputElement>(null)
  // Where the caret should land once the value has been reformatted.
  const caret = useRef<number | null>(null)

  // The component needs the element, and so does whoever passed a ref in.
  const setRef = (node: HTMLInputElement | null): void => {
    inputRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input || caret.current === null) return

    if (document.activeElement === input) {
      input.setSelectionRange(caret.current, caret.current)
    }
    caret.current = null
  })

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const input = event.currentTarget
    const typed = input.value
    let digits = onlyDigits(typed)
    let before = digitsBefore(typed, input.selectionStart ?? typed.length)

    // Backspacing a separator would otherwise put it straight back and look like nothing
    // happened, so take the digit in front of it instead.
    const deleting = (event.nativeEvent as InputEvent).inputType === 'deleteContentBackward'
    if (deleting && digits.length === onlyDigits(value).length && before > 0) {
      digits = digits.slice(0, before - 1) + digits.slice(before)
      before -= 1
    }

    const formatted = format(digits)
    caret.current = caretAfterDigits(formatted, before)
    onChange(formatted)
  }

  return (
    <Input
      {...props}
      ref={setRef}
      value={value}
      onChange={handleChange}
      inputMode="numeric"
      autoComplete={props.autoComplete}
    />
  )
}
