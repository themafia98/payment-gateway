import { Button, Download } from '@/shared/ui'

interface IProps {
  onClick: () => void
  disabled?: boolean
}

export const DownloadReceiptButton = ({ onClick, disabled }: IProps) => {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      leftIcon={<Download />}
      className="h-12"
    >
      Download Receipt
    </Button>
  )
}
