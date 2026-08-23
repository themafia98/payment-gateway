import { ErrorMessage as HookErrorMessage } from '@hookform/error-message'
import { useFormContext } from 'react-hook-form'
import { ErrorText } from './error-text'

interface ErrorMessageProps {
  name: string
}

export const ErrorMessage = ({ name }: ErrorMessageProps) => {
  const {
    formState: { errors },
  } = useFormContext()

  return <HookErrorMessage errors={errors} name={name} as={<ErrorText />} />
}
