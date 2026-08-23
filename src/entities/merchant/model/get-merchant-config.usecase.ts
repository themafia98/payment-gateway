import type { MerchantGateway } from '../api/merchant-gateway'
import type { MerchantConfig } from './types'

// Merchant config use-case: read the storefront config the app renders from.
// Thin today, but it's the seam routes go through instead of calling the gateway
// directly — a fallback config or caching would land here, not in the loader.
export const createGetMerchantConfig = (gateway: MerchantGateway) => (): Promise<MerchantConfig> =>
  gateway.getConfig()
