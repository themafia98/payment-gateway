import { createFileRoute, redirect } from '@tanstack/react-router'
import { Center } from '@/shared/ui'

// Where a provider sends the browser back after taking over the window. Not a 3-D Secure
// route: a hosted payment page returns here too.
//
// This runs in the loader rather than an effect - a lazily loaded plugin may still be on
// its way, and resuming before it arrives would be a race.

interface ReturnSearch {
  intentId?: string
  challengeId?: string
  transStatus?: string
}

const toParams = (search: ReturnSearch): Record<string, string> =>
  Object.fromEntries(
    Object.entries(search).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>

export const Route = createFileRoute('/payment/return')({
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
