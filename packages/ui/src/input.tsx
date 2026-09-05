import type { InputHTMLAttributes, ReactElement, Ref } from 'react'
import { cx } from './cx'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
  /** React 19 hands refs over as an ordinary prop; form libraries rely on it. */
  ref?: Ref<HTMLInputElement>
}

export const Input = ({ className, ref, ...props }: InputProps): ReactElement => (
  <input ref={ref} type="text" className={cx('ck-input', className)} {...props} />
)
