import { Button } from '../../../shared/ui/button.tsx'

interface IProps {
  loading: boolean
}

export const CheckoutButton = ({ loading }: IProps) => {
  return (
    <Button type="submit" className="h-18" disabled={loading}>
      {loading ? 'Processing...' : 'Continue payment'}
    </Button>
  )
}
