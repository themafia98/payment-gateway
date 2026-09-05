// What the receipt calls the way this payment was taken.
//
// Derived from the intent rather than remembered, so it survives a full-page redirect - the
// stored label used to come back as a dash after every 3-D Secure round trip.
const LABELS: Record<string, string> = {
  psp: 'Card',
  acquiring: 'Card',
  hostedfields: 'Card',
  hpp: 'Card, on the bank site',
  wallet: 'Wallet',
  transfer: 'Bank transfer',
}

export const paymentMethodLabel = (providerId: string | undefined): string =>
  (providerId && LABELS[providerId]) || 'Card'
