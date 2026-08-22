/**
 * Public API of the `receipt` entity. Other layers import ONLY from here.
 */
export type { ReceiptGateway } from './api/receipt-gateway'
export { createHttpReceiptGatewayAdapter } from './api/http-receipt-gateway.adapter'
