import { useNavigate } from '@tanstack/react-router'
import { Button, Back } from '@/shared/ui'

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
