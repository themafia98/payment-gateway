// Dependency-free minimal PDF generator for the mock receipt endpoint.
// Produces a genuine single-page application/pdf (valid xref table) so the
// browser renders/downloads it like a real server-issued receipt.
//
// This lives in `mocks/` on purpose: it is a stand-in for a real backend's PDF
// service. The frontend just downloads the bytes and never knows how they were made.

export interface ReceiptFields {
  receiptId: string
  amount: string // already formatted, e.g. "49.99"
  currency: string
  merchant: string
  paymentMethod: string
  last4?: string
  paidAt: string // "2026-08-22"
  status: string
}

// PDF text strings are ASCII-only here; drop non-ASCII and escape PDF specials.
const escape = (s: string): string =>
  s
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')

export const buildReceiptPdf = (f: ReceiptFields): Uint8Array => {
  const lines = [
    `Receipt No:   ${f.receiptId}`,
    `Date:         ${f.paidAt}`,
    `Merchant:     ${f.merchant}`,
    `Payment:      ${f.paymentMethod}${f.last4 ? ` ****${f.last4}` : ''}`,
    `Status:       ${f.status}`,
    `Amount:       ${f.amount} ${f.currency}`,
  ]

  const content =
    `BT\n/F1 22 Tf\n60 780 Td\n(Payment Receipt) Tj\nET\n` +
    `BT\n/F1 12 Tf\n60 730 Td\n14 TL\n` +
    lines.map((l) => `(${escape(l)}) Tj T*`).join('\n') +
    `\nET\n`

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ]

  let pdf = `%PDF-1.4\n`
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })

  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += `0000000000 65535 f \n`
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  return new TextEncoder().encode(pdf)
}
