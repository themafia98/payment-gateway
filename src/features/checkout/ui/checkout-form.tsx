import { useCallback, useState } from 'react'
import { invoice } from '../mocks/invoice'
import { plans } from '../mocks/plans'
import { CheckoutButton } from './checkout-button'
import { CreditCardDetails } from './credit-card-details'
import { DetailsBilling } from './details-billing'
import { PlanSelector } from './plan-selector'
import type { IPlan } from '../../../entities/plan/model/types'
import { PaymentMethodSelector } from './payment-method-selector'
import { Section } from '../../../shared/ui/containers/section'
import { useNavigate } from '@tanstack/react-router'
import { FormProvider, useForm, type SubmitErrorHandler } from 'react-hook-form'
import { formDefaultValues } from '../model/default-values'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkoutFormSchema, type CheckoutFormSchema } from '../model/schema'

export const CheckoutForm = () => {
  // TODO: move to react-hook-form
  const [activePlanId, setActivePlanId] = useState(plans[0].id)

  const methods = useForm({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: formDefaultValues,
  })

  const navigate = useNavigate()

  const handlePayment = () => {
    navigate({ to: '/summary/success' })
  }

  const handleError: SubmitErrorHandler<CheckoutFormSchema> = (e) => {
    console.error(e)
    navigate({ to: '/summary/failure' })
  }

  const handleChangePlan = useCallback((id: IPlan['id']) => {
    setActivePlanId(id)
  }, [])

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(handlePayment, handleError)}
        className="flex h-full flex-col items-stretch justify-start gap-6 bg-[rgba(21,12,37,0.85)] p-[30.8px] backdrop-blur-[15.4px]"
      >
        <Section>
          <PlanSelector plans={plans} selectedPlanId={activePlanId} onChange={handleChangePlan} />
        </Section>
        <Section>
          <PaymentMethodSelector />
        </Section>
        <Section>
          <CreditCardDetails />
        </Section>
        <Section>
          <DetailsBilling invoice={invoice} />
          <CheckoutButton loading={false} />
        </Section>
      </form>
    </FormProvider>
  )
}
