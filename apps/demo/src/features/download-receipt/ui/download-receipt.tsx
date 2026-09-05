import { DownloadReceiptButton } from './download-receipt-button'
import { createHttpReceiptGatewayAdapter } from '@/entities/receipt'
import { createGenerateReceipt } from '../model/generate-receipt.usecase'

interface DownloadReceiptProps {
  intentId?: string
}

export const DownloadReceipt = ({ intentId }: DownloadReceiptProps) => {
  const handleGenerateReceipt = () => {
    if (!intentId) return
    createGenerateReceipt(createHttpReceiptGatewayAdapter())(intentId)
  }

  return (
    <>
      <DownloadReceiptButton onClick={handleGenerateReceipt} disabled={!intentId} />
    </>
  )
}
