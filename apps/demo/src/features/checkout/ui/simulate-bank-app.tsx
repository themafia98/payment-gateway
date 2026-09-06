// The shopper banking app, as two buttons.
//
// A real transfer is paid on a phone and reported to the acquirer by the scheme. There is
// no phone here, so this calls the mock backend directly - it is the demo standing in for
// the shopper, not part of the checkout.

import { useState } from 'react'
import { useCheckout } from '@checkout-kit/react'
import { Button } from '@checkout-kit/ui'

const API = `${import.meta.env.BASE_URL}api`

const pay = async (orderId: string, scenario: 'approve' | 'decline') => {
  // Imported here, not at the top: the test card table has no business in the bundle a
  // real deployment ships.
  const { SCENARIO_CARDS } = await import('@checkout-kit/testing')

  await fetch(`${API}/transfer/orders/${orderId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardNumber: SCENARIO_CARDS[scenario] }),
  })
}

export const SimulateBankApp = () => {
  const { action, intent } = useCheckout()
  const [sent, setSent] = useState(false)

  // Only ever against the mock backend: there is nothing to press otherwise.
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') return null
  if (action?.kind !== 'display' || !intent) return null

  const send = (scenario: 'approve' | 'decline') => {
    setSent(true)
    void pay(intent.id, scenario)
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-dashed border-border-subtle p-4">
      <p className="text-sm text-muted">
        Nothing on this page can see the transfer happen. Press a button below and watch the
        checkout notice on its own, by asking the provider.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          fullWidth={false}
          disabled={sent}
          onClick={() => send('approve')}
        >
          Pay in the bank app
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          fullWidth={false}
          disabled={sent}
          onClick={() => send('decline')}
        >
          Let the bank refuse it
        </Button>
      </div>
    </div>
  )
}
