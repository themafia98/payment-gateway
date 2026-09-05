import { createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { Button, Input, Section } from '@/shared/ui'

// The bank's payment page, standing in for a different site.
//
// In production this is not our code and not our origin. What is faithful is the shape: the
// checkout never sees this card, and what comes back is only a claim.

interface HostedPageSearch {
  orderId?: string
  returnUrl?: string
}

export const Route = createFileRoute('/hosted-page')({
  validateSearch: (search: Record<string, unknown>): HostedPageSearch => ({
    orderId: typeof search.orderId === 'string' ? search.orderId : undefined,
    returnUrl: typeof search.returnUrl === 'string' ? search.returnUrl : undefined,
  }),
  component: HostedPage,
})

function HostedPage() {
  const { orderId, returnUrl } = Route.useSearch()
  const [cardNumber, setCardNumber] = useState('')
  const [busy, setBusy] = useState(false)

  const leave = (status: string) => {
    const back = new URL(returnUrl ?? '/', window.location.origin)
    back.searchParams.set('orderId', orderId ?? '')
    back.searchParams.set('status', status)
    window.location.assign(back.toString())
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!orderId || busy) return
    setBusy(true)

    await fetch(`${import.meta.env.BASE_URL}api/hosted/orders/${orderId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ cardNumber }).toString(),
    })

    // The bank always claims success on the way back. Whether the money moved is a
    // question only the bank's own API can answer, and the plugin asks it.
    leave('success')
  }

  return (
    <Section>
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <h2 className="text-xl text-white">Acme Bank — secure payment</h2>
        <p className="text-sm text-[#9aa0ac]">
          You are on your bank&apos;s page. The shop never sees these details.
        </p>
        <Input
          placeholder="0000 0000 0000 0000"
          aria-label="Card number"
          value={cardNumber}
          onChange={(event) => setCardNumber(event.target.value)}
        />
        <Button type="submit" disabled={busy}>
          Pay
        </Button>
        <button
          type="button"
          onClick={() => leave('cancelled')}
          className="text-sm text-[#9aa0ac] underline"
        >
          Cancel and return to the shop
        </button>
      </form>
    </Section>
  )
}
