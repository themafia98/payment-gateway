import { useMerchant } from '../model/merchant-context'

export const Merchant = () => {
  const { name } = useMerchant()

  return <h3 className="font-bold text-purple-400">{name}</h3>
}
