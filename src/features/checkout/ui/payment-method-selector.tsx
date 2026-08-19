import { useState } from 'react'
import { Tab } from '../../../shared/ui/tabs/tab'
import { Tabs } from '../../../shared/ui/tabs/tabs'
import type { PaymentMethod } from '../../../entities/payment-method/models/types'

export const PaymentMethodSelector = () => {
  const [activeTab, setActiveTab] = useState<PaymentMethod>('Card')

  const handleSwitch = (type: PaymentMethod) => () => {
    setActiveTab(type)
  }

  return (
    <Tabs>
      <Tab onClick={handleSwitch('Card')} isActive={activeTab === 'Card'}>
        Card
      </Tab>
      <Tab onClick={handleSwitch('Bank Transfer')} isActive={activeTab === 'Bank Transfer'}>
        Bank Transfer
      </Tab>
    </Tabs>
  )
}
