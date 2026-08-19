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

export const CheckoutForm = () => {
  // TODO: move to react-hook-form
  const [activePlanId, setActivePlanId] = useState(plans[0].id)

  const navigate = useNavigate()

  const handlePayment = () => {
    navigate({ to: '/summary/success' })
  }

  const handleChangePlan = useCallback((id: IPlan['id']) => {
    setActivePlanId(id)
  }, [])

  return (
    <div className="flex h-full flex-col items-stretch justify-start gap-6 bg-[rgba(21,12,37,0.85)] p-[30.8px] backdrop-blur-[15.4px]">
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
        <CheckoutButton loading={false} onClick={handlePayment} />
      </Section>
    </div>
  )
}
