import { useCheckout } from '@checkout-kit/react'
import { Tabs, Tab } from '@/shared/ui'

// Which acquirer takes the money. Normally a merchant setting nobody sees; here it is a
// switch on the page, because the whole point is to watch the same checkout run through
// two entirely different bank protocols.
//
// This component knows the plugins only by id. It cannot see what either of them does.

const PROVIDER_LABELS: Record<string, string> = {
  psp: 'Card processor',
  acquiring: 'Acquiring bank',
  hpp: 'Bank page',
  hostedfields: 'Hosted fields',
  wallet: 'Wallet',
  transfer: 'Instant transfer',
}

export const ProviderSelector = () => {
  const { engine, providerId, isBusy } = useCheckout()

  return (
    <Tabs>
      {engine.providerIds.map((id) => (
        <Tab
          key={id}
          isActive={id === providerId}
          // Switching mid-payment would send the authentication to the wrong bank.
          disabled={isBusy}
          onClick={() => void engine.useProvider(id)}
        >
          {PROVIDER_LABELS[id] ?? id}
        </Tab>
      ))}
    </Tabs>
  )
}
