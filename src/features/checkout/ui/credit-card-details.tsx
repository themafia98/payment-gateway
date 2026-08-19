import { Input } from '../../../shared/ui/input'
import { FormDetail } from '../../../shared/ui/text/form-detail'
import { Label } from '../../../shared/ui/text/label'

export const CreditCardDetails = () => {
  return (
    <>
      <Label>Credit card details</Label>

      <div className="flex flex-col gap-2">
        <div className="flex">
          <Input placeholder="MM / YYYYY" />
        </div>
        <div className="flex gap-2 pb-2 flex-wrap">
          <Input type="text" pattern="\d*" maxLength={16} placeholder="0000 0000 0000 0000" />
          <Input autoComplete="cc-csc" placeholder="CVC" type="text" pattern="\d*" maxLength={3} />
        </div>
        <FormDetail>
          By providing your card information, you allow us to charge your card for future payments
          in accordance with their terms.
        </FormDetail>
      </div>
    </>
  )
}
