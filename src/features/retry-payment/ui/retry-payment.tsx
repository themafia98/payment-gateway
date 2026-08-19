import { useNavigate } from '@tanstack/react-router'
import { RetryPaymentButton } from './retry-payment-button'

export const RetryPayment = () => {
  const navigate = useNavigate()

  const handleRetryPayment = () => {
    navigate({ to: '/' })
  }

  return (
    <section className="space-y-4">
      <RetryPaymentButton onRetry={handleRetryPayment} />
    </section>
  )
}
