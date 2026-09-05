import type { ReceiptGateway } from '@/entities/receipt'
import { saveBlob } from '@/shared/lib'

export const createGenerateReceipt =
  (gateway: ReceiptGateway) =>
  async (intentId: string): Promise<void> => {
    const blob = await gateway.getReceipt(intentId)
    saveBlob(blob, `receipt-${intentId}.pdf`)
  }
