import { invoice } from '../model/invoice-fixture'
import { plans } from '../model/plans-fixture'
import { CheckoutButton } from './checkout-button'
import { CreditCardDetails } from './credit-card-details/credit-card-details'
import { Billing } from './billing'
import { PlanSelector } from './plan-selector'
import { PaymentMethodSelector } from './payment-method-selector'
import { Section } from '@/shared/ui'
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
import { createPayCheckout } from '@/features/checkout/model/pay.usecase.ts'
import { createHttpPaymentGatewayAdapter } from '@/entities/payment'

export const CheckoutForm = () => {
  const methods = useForm<CheckoutFormInput, unknown, CheckoutFormSchema>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: formDefaultValues,
  })

  const navigate = useNavigate()

  const handlePayment: SubmitHandler<CheckoutFormSchema> = (form) => {
    const paymentAction = createPayCheckout(createHttpPaymentGatewayAdapter())

    paymentAction(form).then((result) => {
      if (result.status === 'succeeded') {
        navigate({ to: '/summary/success' })
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
        })
      }
    })
  }

  const handleError: SubmitErrorHandler<CheckoutFormInput> = (e) => {
    console.error(e)
    navigate({ to: '/summary/failure' })
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
          <CheckoutDetails invoice={invoice} />
          <CheckoutButton loading={false} />
        </Section>
      </form>
    </FormProvider>
  )
}
