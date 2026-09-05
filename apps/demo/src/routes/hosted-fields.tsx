import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

// The provider's card fields, standing in for a frame served from the provider's origin.
//
// In production this page is not ours and not on our origin; here it is a route in the same
// app, because a front-end-only mock cannot serve a second origin. The mechanism is the
// same either way: the card is typed here, swapped for a token here, and only the token
// leaves.

interface HostedFieldsSearch {
  actionId?: string
}

export const Route = createFileRoute('/hosted-fields')({
  validateSearch: (search: Record<string, unknown>): HostedFieldsSearch => ({
    actionId: typeof search.actionId === 'string' ? search.actionId : undefined,
  }),
  component: HostedFields,
})

function HostedFields() {
  const { actionId } = Route.useSearch()
  const [cardNumber, setCardNumber] = useState('')
  const [busy, setBusy] = useState(false)

  // A click, not a form submission. The frame is sandboxed without `allow-forms` - it has
  // no business navigating anything - and real hosted fields do not submit either: they
  // tokenize over fetch and answer with a message.
  const handlePay = async () => {
    if (busy) return
    setBusy(true)

    const response = await fetch(`${import.meta.env.BASE_URL}api/hosted-fields/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNumber }),
    })
    const { token } = (await response.json()) as { token: string }

    // A token and an action id. Never the card - the parent has no way to ask for it.
    window.parent.postMessage({ type: 'ck-fields-token', actionId, token }, '*')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        font: '16px system-ui, sans-serif',
        color: '#e9e9e9',
      }}
    >
      <label htmlFor="hosted-card-number" style={{ fontSize: '13px', color: '#9aa0ac' }}>
        Card number (secured by your payment provider)
      </label>
      <input
        id="hosted-card-number"
        name="cardNumber"
        inputMode="numeric"
        placeholder="0000 0000 0000 0000"
        value={cardNumber}
        onChange={(event) => setCardNumber(event.target.value)}
        style={{
          padding: '12px 14px',
          fontSize: '18px',
          borderRadius: '10px',
          border: '1px solid #2e303a',
          background: '#12141b',
          color: '#fff',
        }}
      />
      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={busy}
        style={{
          padding: '12px',
          fontSize: '16px',
          border: 0,
          borderRadius: '10px',
          background: '#aa3bff',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Pay securely
      </button>
    </div>
  )
}
