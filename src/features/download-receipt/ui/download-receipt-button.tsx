import { Button, Download } from '@/shared/ui'

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
