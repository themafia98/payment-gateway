import { DonwloadReceiptButton } from './download-receipt-button'

export const DownloadReceipt = () => {
  const handleGenerateReceipt = () => {
    console.log('generate')
  }

  return (
    <>
      <DonwloadReceiptButton onClick={handleGenerateReceipt} />
    </>
  )
}
