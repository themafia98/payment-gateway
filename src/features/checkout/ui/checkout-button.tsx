import { Button } from '../../../shared/ui/button.tsx'

interface IProps {
  onClick: () => void
  loading: boolean
}

export const CheckoutButton = ({ onClick, loading }: IProps) => {
  return (
    <Button type="button" onClick={onClick} className="h-18" disabled={loading}>
      {loading ? 'Processing...' : 'Continue payment'}
    </Button>
  )
}
