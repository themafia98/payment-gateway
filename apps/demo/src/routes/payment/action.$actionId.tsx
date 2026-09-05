import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PaymentActionHost } from '@checkout-kit/react'
import { AuthenticationState, Button } from '@checkout-kit/ui'
import type { PaymentResult } from '@/entities/payment'

// Where an action that needs a screen is shown - a 3-D Secure challenge today, hosted card
// fields tomorrow. It contains no protocol at all: the engine holds the action the
// provider asked for, and this route only decides where it renders and where the shopper
// goes once it is done.

interface ChallengeSearch {
  intentId?: string
}

export const Route = createFileRoute('/payment/action/$actionId')({
  validateSearch: (search: Record<string, unknown>): ChallengeSearch => ({
    intentId: typeof search.intentId === 'string' ? search.intentId : undefined,
  }),
  component: ThreeDSPage,
})

function ThreeDSPage() {
  const { intentId } = Route.useSearch()
  const { checkout } = Route.useRouteContext()
  const navigate = useNavigate()

  const goToFailure = () => void navigate({ to: '/summary/failure', search: { intentId } })

  const handleSettled = (result: PaymentResult) => {
    if (result.status === 'succeeded') {
      void navigate({ to: '/summary/success', search: { intentId: result.intent.id } })
      return
    }
    goToFailure()
  }

  // Giving up releases the money as well as the screen: the engine tells the provider to
  // cancel the intent, so an abandoned payment does not sit there holding an authorization.
  const handleCancel = () => {
    void checkout.abort('user').then(goToFailure)
  }

  return (
    <AuthenticationState
      actions={
        <>
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel payment
          </Button>

          {/* Some banks would rather own the whole window. Same action, different surface -
              the provider is not asked twice and knows nothing about the choice. */}
          {import.meta.env.DEV ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void checkout.runPendingAction({ surface: 'top' })}
            >
              Open bank in this window (full-page redirect)
            </Button>
          ) : null}
        </>
      }
    >
      <PaymentActionHost onSettled={handleSettled} className="ck-action-host" />
    </AuthenticationState>
  )
}
