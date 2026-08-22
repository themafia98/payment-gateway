import { DonwloadReceiptButton } from './download-receipt-button'
import { createHttpReceiptGatewayAdapter } from '@/entities/receipt'
import { createGenerateReceipt } from '@/features/download-receipt/model/generate-receipt.usecase.ts'

export const DownloadReceipt = () => {
  const handleGenerateReceipt = () => {
    createGenerateReceipt(createHttpReceiptGatewayAdapter())('mock-intent-id')
  }

  return (
    <>
      <DonwloadReceiptButton onClick={handleGenerateReceipt} />
    </>
  )
}
