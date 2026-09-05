interface IProps {
  children: string
}

export const Label = ({ children }: IProps) => (
  <label className="self-stretch flex font-inter text-[23.1px] text-left text-[#b0b0b0]">
    {children}
  </label>
)
