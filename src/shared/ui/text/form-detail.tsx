interface IProps {
  children: string
}

export const FormDetail = ({ children }: IProps) => {
  return (
    <p className="self-stretch flex font-inter text-[14.5px]  text-left text-[#b0b0b0]">
      {children}
    </p>
  )
}
