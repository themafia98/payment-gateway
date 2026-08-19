import { Button } from '../../../shared/ui/button'
import { Download } from '../../../shared/ui/icons/download'

interface IProps {
  onClick: () => void
}

export const DonwloadReceiptButton = ({ onClick }: IProps) => {
  return (
    <Button type="button" onClick={onClick} leftIcon={<Download />} className="h-12">
      Download Receipt
    </Button>
  )
}
