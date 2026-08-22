/**
 * LAYER: Port (api segment of the `receipt` entity).
 *
 * A receipt is an opaque, server-issued file (PDF). The frontend DOWNLOADS it —
 * it does not parse it — so the contract is just "give me the bytes for this
 * payment". No `Receipt` domain model is needed for that.
 *
 * (If you later also need on-screen receipt DATA, add a JSON endpoint and a
 * `model/types.ts` `Receipt` type — that would be a second, separate method.)
 */
export interface ReceiptGateway {
  /** Fetch the receipt PDF for a succeeded payment. Mock: GET /api/payment-intents/:id/receipt */
  getReceipt(intentId: string): Promise<Blob>
}
