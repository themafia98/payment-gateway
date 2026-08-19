import { Bubble } from '../../../shared/ui/bubble'
import { Chip } from '../../../shared/ui/chip'
import type { IPlan } from '../model/types'

interface IProps {
  plan: IPlan
  selected: boolean
  onSelect: () => void
}

export const PlanCard = ({ plan, selected, onSelect }: IProps) => {
  return (
    <div
      onClick={onSelect}
      className="flex h-[66.6px] flex-row items-center justify-between gap-[15.4px] self-stretch rounded-[10.3px] border-2 border-solid border-gray-500 bg-transparent px-[15.4px]"
    >
      <div className="flex gap-4">
        <Bubble isActive={selected} />
        <p className="w-16.75 h-7 flex font-inter text-[23.1px] text-left text-[#e9e9e9]">
          {plan.name}
        </p>
      </div>
      <div className="flex gap-4">
        {plan.discount && <Chip>{plan.discount}</Chip>}
        <p className="h-7 flex font-inter text-[23.1px] text-left text-[#b0b0b0]">
          {plan.currency}
          {plan.price}
        </p>
      </div>
    </div>
  )
}
