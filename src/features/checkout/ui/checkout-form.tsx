import { useState } from 'react'
import { Tab } from '../../../shared/ui/tabs/tab'
import { Tabs } from '../../../shared/ui/tabs/tabs'
import { invoice } from '../mocks/invoice'
import { plans } from '../mocks/plans'
import { CheckoutButton } from './checkout-button'
import { CreditCardDetails } from './credit-card-details'
import { DetailsBilling } from './details-billing'
import { PlanSelector } from './plan-selector'
import type { IPlan } from '../../../entities/plan/model/types'

export const CheckoutForm = () => {
  const [activePlanId, setActivePlanId] = useState(plans[0].id)
  const [activeTab, setActiveTab] = useState('Card')

  const handlePayment = () => {
    console.log('handlePayment')
  }

  const handleChangePlan = (id: IPlan['id']) => {
    setActivePlanId(id)
  }

  return (
    <div className="flex h-full flex-col items-stretch justify-start gap-6 bg-[rgba(21,12,37,0.85)] p-[30.8px] backdrop-blur-[15.4px]">
      <section className="flex flex-col gap-4">
        <PlanSelector plans={plans} selectedPlanId={activePlanId} onChange={handleChangePlan} />
      </section>
      <section>
        <Tabs>
          <Tab onClick={() => setActiveTab('Card')} isActive={activeTab === 'Card'}>
            Card
          </Tab>
          <Tab
            onClick={() => setActiveTab('Bank Transfer')}
            isActive={activeTab === 'Bank Transfer'}
          >
            Bank Transfer
          </Tab>
        </Tabs>
      </section>
      <section className="flex flex-col gap-4">
        <CreditCardDetails />
      </section>
      <section className="flex flex-col">
        <DetailsBilling invoice={invoice} />
        <CheckoutButton loading={false} onClick={handlePayment} />
      </section>
    </div>
  )
}
