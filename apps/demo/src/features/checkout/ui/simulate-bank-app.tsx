// The shopper's banking app, as a button.
//
// A real transfer is paid on a phone and reported to the acquirer by the scheme. There is
// no phone here, so this calls the mock backend directly - it is the demo standing in for
// the shopper, not part of the checkout.

import { useState } from 'react'
import { useCheckout } from '@checkout-kit/react'
import { SCENARIO_CARDS } from '@checkout-kit/testing'

const API = `${import.meta.env.BASE_URL}api`

const pay = (orderId: string, cardNumber: string) =>
  fetch(`${API}/transfer/orders/${orderId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardNumber }),
  })

export const SimulateBankApp = () => {
  const { action, intent } = useCheckout()
  const [sent, setSent] = useState(false)

  // Only ever against the mock backend: there is nothing to press otherwise.
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') return null
  if (action?.kind !== 'display' || !intent) return null

  const send = (cardNumber: string) => {
    setSent(true)
    void pay(intent.id, cardNumber)
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[#3a3d47] p-3">
      <p className="text-sm text-[#9aa0ac]">
        Nothing on this page can see the transfer happen. Press a button below and watch the
        checkout notice on its own, by asking the provider.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={sent}
          onClick={() => send(SCENARIO_CARDS.approve)}
          className="rounded-lg bg-[#aa3bff] px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Pay in the bank app
        </button>
        <button
          type="button"
          disabled={sent}
          onClick={() => send(SCENARIO_CARDS.decline)}
          className="rounded-lg border border-[#3a3d47] px-3 py-2 text-sm disabled:opacity-50"
        >
          Let the bank refuse it
        </button>
      </div>
    </div>
  )
}
