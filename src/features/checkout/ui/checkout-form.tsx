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
import { createPayCheckout } from '../model/pay.usecase'
import { createHttpPaymentGatewayAdapter } from '@/entities/payment'
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

  const isBusy = useCheckoutIsBusy()
  const checkoutError = useCheckoutError()
  const { startPayment, applyResult, reset } = useCheckoutActions()

  useEffect(() => {
    reset()
  }, [reset])

  const handlePayment: SubmitHandler<CheckoutFormSchema> = (form) => {
    if (isBusy) {
      return
    }

    startPayment(form.paymentMethod)

    const idempotencyKey = crypto.randomUUID()

    const paymentAction = createPayCheckout(createHttpPaymentGatewayAdapter())

    paymentAction(form, idempotencyKey)
      .then((result) => {
        applyResult(result)

        if (result.status === 'succeeded') {
          navigate({ to: '/summary/success', search: { intentId: result.intent.id } })
          return
        }

        if (result.status === 'requires_action') {
          const challengeId = result.challenge.url.split('/').pop()

          if (!challengeId) {
            return
          }

          navigate({
            to: '/3ds/challenge/$challengeId',
            params: {
              challengeId,
            },
            search: {
              intentId: result.intent.id,
            },
          })
        }
      })
      .catch((e) => {
        applyResult({
          status: 'error',
          error: { message: e instanceof Error ? e.message : 'Payment failed. Please try again.' },
        })
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
        className="flex h-full flex-col items-stretch justify-start gap-6 bg-[rgba(21,12,37,0.85)] p-[30.8px] backdrop-blur-[15.4px]"
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
