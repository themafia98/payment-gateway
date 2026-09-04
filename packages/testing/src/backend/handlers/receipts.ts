import { http, HttpResponse } from 'msw'
import type { HttpHandler } from 'msw'
import { merchantConfig, paymentIntents } from '../data'
import { networkDelay } from '../lib/delay'
import { error, notFound } from '../lib/respond'
import { buildReceiptPdf } from '../lib/receipt-pdf'

export const receiptHandlers: HttpHandler[] = [
  // Server-issued PDF receipt. Only succeeded intents have one (like the real world).
  // Frontend: fetch this, read as Blob, trigger a download.
  http.get('*/api/payment-intents/:id/receipt', async ({ params }) => {
    await networkDelay()

    const intent = paymentIntents.get(String(params.id))
    if (!intent) return notFound('payment intent')

    if (intent.status !== 'succeeded') {
      return error(409, {
        type: 'invalid_request_error',
        code: 'receipt_unavailable',
        message: `Receipt is available only for succeeded payments (status '${intent.status}').`,
      })
    }

    const pdf = buildReceiptPdf({
      receiptId: intent.id,
      amount: (intent.amount / 100).toFixed(2), // stored in minor units
      currency: intent.currency.toUpperCase(),
      merchant: merchantConfig.name,
      paymentMethod: 'Card',
      paidAt: new Date(intent.created * 1000).toISOString().slice(0, 10),
      status: 'Paid',
    })

    return new HttpResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${intent.id}.pdf"`,
        'Content-Length': String(pdf.byteLength),
      },
    })
  }),
]
