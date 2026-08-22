import { DonwloadReceiptButton } from './download-receipt-button'
import { createHttpReceiptGatewayAdapter } from '@/entities/receipt'
import {createPayCheckout} from "@/features/download-receipt/model/generate-receipt.usecase.ts";


export const DownloadReceipt = () => {
  const handleGenerateReceipt = () => {
    createPayCheckout(createHttpReceiptGatewayAdapter())("mock-intent-id");
  }

  return (
    <>
      <DonwloadReceiptButton onClick={handleGenerateReceipt} />
    </>
  )
}
