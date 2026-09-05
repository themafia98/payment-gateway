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

  // Whether this provider wants a card at all - a hosted page collects it elsewhere.
  // Until the plugin has loaded, assume the common case.
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

    // The form hands over a plan and whatever it collected. Which provider takes it, and
    // what happens next, is decided behind the engine.
    engine
      .pay({
        input: { planId: form.planId },
        // No card is a normal instrument: it is what a hosted provider expects.
        instrument: form.card ? { kind: 'card', ...form.card } : { kind: 'none' },
      })
      .then((result) => {
        if (result.status === 'succeeded') {
          navigate({ to: '/summary/success', search: { intentId: result.intent.id } })
          return
        }

        if (result.status === 'requires_action') {
          // Where the action renders is all this form needs to know about it.
          const { surface } = result.action

          // Nothing of ours to render: a redirect leaves by itself, a wallet draws its own
          // sheet. Staying here also means a decline lands back on the form.
          if (surface === 'top' || surface === 'none') {
            void engine.runPendingAction().then(handleSettled)
            return
          }

          // Fields belong where the shopper is already looking. Navigating away to show a
          // card form that is supposed to sit inside the checkout would be absurd.
          if (surface === 'inline') return

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
