import type { MerchantConfig } from '../model/types'

export interface MerchantGateway {
  getConfig(): Promise<MerchantConfig>
}
