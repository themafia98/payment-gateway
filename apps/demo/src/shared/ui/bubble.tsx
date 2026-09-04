import { useMemo } from 'react'
import { cn } from '../lib/cn'

interface IProps {
  isActive: boolean
}

const classNamesStates = {
  active: 'bg-white',
  inactive: 'border-white bg-transparent',
}

export const Bubble = ({ isActive }: IProps) => {
  const className = useMemo(() => {
    return isActive ? classNamesStates.active : classNamesStates.inactive
  }, [isActive])

  return (
    <div
      className={cn(
        'flex h-[28.2px] w-[28.2px] rounded-[64.1px] border-2 pb-[8.4px] pl-[7.2px] pr-[6.6px] pt-[8.4px]',
        className,
      )}
    />
  )
}
