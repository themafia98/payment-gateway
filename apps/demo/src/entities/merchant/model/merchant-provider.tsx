import type { ReactNode } from 'react'
import type { MerchantConfig } from './types'
import { MerchantContext } from './merchant-context'

interface IProps {
  children: ReactNode
  value: MerchantConfig | null
}

export const MerchantProvider = ({ children, value }: IProps) => (
  <MerchantContext.Provider value={value}>{children}</MerchantContext.Provider>
)
