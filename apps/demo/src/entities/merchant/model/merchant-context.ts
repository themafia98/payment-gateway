import { createContext, use } from 'react'
import type { MerchantConfig } from './types'

export const MerchantContext = createContext<MerchantConfig | null>(null)

export const useMerchant = () => {
  const context = use(MerchantContext)

  if (!context) {
    throw new Error('useMerchant must be used within <MerchantProvider>')
  }

  return context
}
