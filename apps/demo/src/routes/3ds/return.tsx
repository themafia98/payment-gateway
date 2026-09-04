import { createFileRoute, redirect } from '@tanstack/react-router'
import { Center } from '@/shared/ui'

// Where the bank sends the browser back after a full-page authentication.
//
// The reload wiped every bit of React state, so the payment is picked up from what the
// engine wrote down before it left: which provider, which intent, which action. The query
// string is handed over as-is - the plugin decides what `transStatus=Y` means, and the
// engine re-reads the intent rather than believing it.
//
// This runs in the loader, not an effect: the plugin may still need to be fetched, and
// resuming before it has loaded would be a race.

interface ReturnSearch {
  intentId?: string
  challengeId?: string
  transStatus?: string
}

const toParams = (search: ReturnSearch): Record<string, string> =>
  Object.fromEntries(
    Object.entries(search).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>

export const Route = createFileRoute('/3ds/return')({
  validateSearch: (search: Record<string, unknown>): ReturnSearch => ({
    intentId: typeof search.intentId === 'string' ? search.intentId : undefined,
    challengeId: typeof search.challengeId === 'string' ? search.challengeId : undefined,
    transStatus: typeof search.transStatus === 'string' ? search.transStatus : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const result = await context.checkout.hydrate(toParams(deps))

    if (result?.status === 'succeeded') {
      throw redirect({ to: '/summary/success', search: { intentId: result.intent.id } })
    }

    throw redirect({
      to: '/summary/failure',
      search: { intentId: result?.intent?.id ?? deps.intentId },
    })
  },
  component: ThreeDSReturnPage,
})

function ThreeDSReturnPage() {
  return (
    <Center>
      <p className="text-white">Finishing authentication…</p>
    </Center>
  )
}
