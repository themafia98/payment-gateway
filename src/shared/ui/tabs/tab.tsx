import { useMemo, type MouseEventHandler } from "react";
import { cn } from "../../lib/cn";

interface IProps {
  isActive: boolean;
  children: string;
  onClick: MouseEventHandler<HTMLDivElement>;
}

const states = {
  active: "bg-[#4f4f4f]",
  inactive: "bg-transparent",
}

export const Tab = ({ children, onClick, isActive }: IProps) => {
  const classNameState = useMemo(() => {
    return isActive ? states.active : states.inactive;
  }, [isActive]);

  return (
    <div onClick={onClick} className={cn("flex flex-1 flex-row items-center justify-center gap-[7.9px] self-stretch rounded-[10.5px] px-[20.5px] shadow-[0_0_5.2px_5.9px_rgba(65,65,65,0.07)]", classNameState)}>
      <p className="flex font-inter text-[23.1px] text-left text-[#e9e9e9]">{children}</p>
    </div>
  )
}
