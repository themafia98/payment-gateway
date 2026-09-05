import { createApiClient, type HttpClient } from '@/shared/api'
import type { MerchantConfig } from '../model/types'
import type { MerchantGateway } from './merchant-gateway'

interface MerchantDto {
  id: string
  name: string
  currency: string
  amount: number
}

const toMerchantConfig = (dto: MerchantDto): MerchantConfig => ({
  id: dto.id,
  name: dto.name,
})

export const createHttpMerchantGatewayAdapter = (
  http: HttpClient = createApiClient(),
): MerchantGateway => ({
  async getConfig(): Promise<MerchantConfig> {
    const dto = await http.get<MerchantDto>('/merchant/config')
    return toMerchantConfig(dto)
  },
})
