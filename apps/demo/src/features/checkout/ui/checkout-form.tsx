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
  checkoutFormSchema,
  type CheckoutFormSchema,
} from '../model/schema'
import { CheckoutDetails } from './checkout-details'
import { useCheckoutEngine } from '@pg/react'
import type { Plan } from '@/entities/plan'
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
  const methods = useForm<CheckoutFormInput, unknown, CheckoutFormSchema>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: formDefaultValues,
  })

  const navigate = useNavigate()
  const engine = useCheckoutEngine()

  const isBusy = useCheckoutIsBusy()
  const checkoutError = useCheckoutError()
  const { setMethod } = useCheckoutActions()

  // A fresh form is a fresh payment. Resetting the engine is enough - the store follows.
  useEffect(() => {
    engine.reset()
  }, [engine])

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
        instrument: {
          kind: 'card',
          number: form.card.number,
          exp: form.card.exp,
          cvc: form.card.cvc,
        },
      })
      .then((result) => {
        if (result.status === 'succeeded') {
          navigate({ to: '/summary/success', search: { intentId: result.intent.id } })
          return
        }

        if (result.status === 'requires_action') {
          navigate({
            to: '/3ds/challenge/$challengeId',
            params: { challengeId: result.action.id },
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
        <Section>
          <CreditCardDetails />
        </Section>
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
