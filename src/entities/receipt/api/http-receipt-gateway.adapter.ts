import { createHttpClient, type HttpClient } from '@/shared/api'
import type { ReceiptGateway } from './receipt-gateway'

// HTTP implementation of the ReceiptGateway port. The endpoint returns binary
// application/pdf, so we use http.getBlob (same error contract, Blob body).
export const createHttpReceiptGatewayAdapter = (
  http: HttpClient = createHttpClient(),
): ReceiptGateway => ({
  getReceipt: (intentId) => http.getBlob(`/payment-intents/${intentId}/receipt`),
})
