import { CheckoutButton } from './checkout-button'
import { CreditCardDetails } from './credit-card-details/credit-card-details'
import { Billing } from './billing'
import { PlanSelector } from './plan-selector'
import { PaymentMethodSelector } from './payment-method-selector'
import { Section, ErrorText } from '@/shared/ui'
import { useNavigate } from '@tanstack/react-router'
import { FormProvider, useForm, type SubmitErrorHandler, type SubmitHandler } from 'react-hook-form'
import { formDefaultValues } from '../model/default-values'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  type CheckoutFormInput,
  createCheckoutFormSchema,
  type CheckoutFormSchema,
} from '../model/schema'
import { CheckoutDetails } from './checkout-details'
import { PaymentActionHost, useCheckout } from '@pg/react'
import type { Plan } from '@/entities/plan'
import type { PaymentResult } from '@/entities/payment'
import {
  useCheckoutActions,
  useCheckoutError,
  useCheckoutIsBusy,
} from '../store/checkout.selectors'
import { useEffect } from 'react'

interface CheckoutFormProps {
  plans: Plan[]
}

export const CheckoutForm = ({ plans }: CheckoutFormProps) => {
  const { engine, capabilities, action } = useCheckout()

  // Whether this provider wants a card at all. A hosted payment page collects it on the
  // bank's own site; asking for it here would be pointless, and the fields would go
  // nowhere. Until the plugin has loaded, assume the common case.
  const collectsCard = capabilities?.instruments.includes('card') ?? true

  const methods = useForm<CheckoutFormInput, unknown, CheckoutFormSchema>({
    resolver: zodResolver(createCheckoutFormSchema(collectsCard)),
    defaultValues: formDefaultValues,
  })

  const navigate = useNavigate()

  const isBusy = useCheckoutIsBusy()
  const checkoutError = useCheckoutError()
  const { setMethod } = useCheckoutActions()

  // A fresh form is a fresh payment. Resetting the engine is enough - the store follows.
  useEffect(() => {
    engine.reset()
  }, [engine])

  const handleSettled = (result: PaymentResult) => {
    if (result.status === 'succeeded') {
      void navigate({ to: '/summary/success', search: { intentId: result.intent.id } })
    }
  }

  const handlePayment: SubmitHandler<CheckoutFormSchema> = (form) => {
    if (isBusy) {
      return
    }

    setMethod(form.paymentMethod)

    // The form hands over card details and a plan; which provider takes them, whether the
    // card is even sent to us, and what authentication follows are all decided behind the
    // engine. Nothing here changes when the integration does.
    engine
      .pay({
        input: { planId: form.planId },
        // No card is a perfectly good instrument: it is what a provider that collects one
        // elsewhere expects to be handed.
        instrument: form.card ? { kind: 'card', ...form.card } : { kind: 'none' },
      })
      .then((result) => {
        if (result.status === 'succeeded') {
          navigate({ to: '/summary/success', search: { intentId: result.intent.id } })
          return
        }

        if (result.status === 'requires_action') {
          // An action that wants the whole window has nothing to render here: running it
          // navigates away by itself, and a screen in between would only flash. Anything
          // that needs a frame gets a page to live on.
          if (result.action.surface === 'top') {
            void engine.runPendingAction()
            return
          }

          // Fields belong where the shopper is already looking. Navigating away to show a
          // card form that is supposed to sit inside the checkout would be absurd.
          if (result.action.surface === 'inline') return

          navigate({
            to: '/payment/action/$actionId',
            params: { actionId: result.action.id },
            search: { intentId: result.intent.id },
          })
        }
      })
      .catch((cause: unknown) => {
        // The engine reports failures as results rather than throwing, so reaching here
        // means something outside the payment broke.
        if (import.meta.env.DEV) console.error(cause)
      })
  }

  const handleError: SubmitErrorHandler<CheckoutFormInput> = (e) => {
    if (import.meta.env.DEV) {
      console.error(e)
    }
  }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(handlePayment, handleError)}
        className="flex flex-col items-stretch justify-start gap-6"
      >
        <Section>
          <PlanSelector plans={plans} />
        </Section>
        <Section>
          <PaymentMethodSelector />
        </Section>
        {collectsCard && (
          <Section>
            <CreditCardDetails />
          </Section>
        )}

        {action?.surface === 'inline' && (
          <Section>
            <PaymentActionHost
              onSettled={handleSettled}
              className="h-[220px] w-full overflow-hidden rounded-xl border border-[#2e303a] bg-[#1b1e27]"
            />
          </Section>
        )}
        <Section>
          <Billing />
        </Section>
        <Section>
          <CheckoutDetails plans={plans} />
          <ErrorText>{checkoutError?.message}</ErrorText>
          <CheckoutButton loading={isBusy} />
        </Section>
      </form>
    </FormProvider>
  )
}
