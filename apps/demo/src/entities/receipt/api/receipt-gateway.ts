// Port: a receipt is an opaque server-issued PDF the frontend just downloads, so
// the contract is only "give me the bytes". (For on-screen receipt data you'd add
// a JSON endpoint + a Receipt model as a separate method.)
export interface ReceiptGateway {
  /** Fetch the receipt PDF for a succeeded payment. Mock: GET /api/payment-intents/:id/receipt */
  getReceipt(intentId: string): Promise<Blob>
}
