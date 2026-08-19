import { useNavigate } from '@tanstack/react-router'
import { Button } from '../../../shared/ui/button'
import { Back } from '../../../shared/ui/icons/back'

export const ReturnToStoreButton = () => {
  const navigate = useNavigate()

  const handleNavigate = () => {
    navigate({ to: '/' })
  }

  return (
    <Button
      type="button"
      leftIcon={<Back />}
      onClick={handleNavigate}
      variant="secondary"
      className="h-12 text-xl"
    >
      Return To Store
    </Button>
  )
}
