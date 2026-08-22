import { createHttpClient, type HttpClient } from '@/shared/api'
import type { ReceiptGateway } from './receipt-gateway'

/**
 * LAYER: Adapter — HTTP implementation of the `ReceiptGateway` port.
 *
 * The endpoint returns binary `application/pdf`, so we use `http.getBlob` (which
 * shares the same error contract as get/post but returns a Blob instead of JSON).
 * No DTO -> domain mapping here: a PDF is opaque bytes, nothing to translate.
 */
export const createHttpReceiptGatewayAdapter = (
  http: HttpClient = createHttpClient(),
): ReceiptGateway => ({
  getReceipt: (intentId) => http.getBlob(`/payment-intents/${intentId}/receipt`),
})
