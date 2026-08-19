import type { ReactNode } from "react";

interface IProps {
    children: ReactNode;
}

export const Tabs = ({ children }: IProps) => {
  return (
    <div className="flex h-[76.5px] flex-row items-stretch justify-start gap-4 self-stretch rounded-[10.5px] bg-[#3d3d3d] p-[5.9px]">
        {children}
    </div>
  )
}
