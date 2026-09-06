import type { InputHTMLAttributes, ReactElement, Ref } from 'react'
import { cx } from './cx'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Usually comes from <Field>, along with the id and the described-by. */
  invalid?: boolean
  className?: string
  /** React 19 hands refs over as an ordinary prop; form libraries rely on it. */
  ref?: Ref<HTMLInputElement>
}

export const Input = ({ className, invalid, ref, ...props }: InputProps): ReactElement => (
  <input
    ref={ref}
    className={cx('ck-input', className)}
    aria-invalid={invalid || props['aria-invalid'] || undefined}
    {...props}
  />
)
