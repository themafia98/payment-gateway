import { Button } from '@/shared/ui'

interface IProps {
  onRetry: () => void
}

export const RetryPaymentButton = ({ onRetry }: IProps) => (
  <Button type="button" onClick={onRetry}>
    Try again
  </Button>
)
