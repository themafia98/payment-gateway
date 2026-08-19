export const CreditCardDetails = () => {
  return (
    <>
      <label className="self-stretch flex font-inter text-[23.1px] text-left text-[#b0b0b0]">
        Credit card details
      </label>

      <div className="flex flex-col gap-2">
        <input
          className="flex h-[66.6px] flex-row items-center justify-between self-stretch rounded-[10.3px] bg-[#3d3d3d] px-4 text-white"
          placeholder="MM / YYYYY"
        />
        <div className="flex gap-2 pb-2">
          <input
            className="flex h-[66.6px] flex-1 flex-row items-center justify-between self-stretch rounded-[10.3px] bg-[#3d3d3d] px-4 text-white"
            type="text"
            pattern="\d*"
            maxLength={16}
            placeholder="0000 0000 0000 0000"
          />
          <input
            className="flex h-[66.6px] flex-1 flex-row items-center justify-between self-stretch rounded-[10.3px] bg-[#3d3d3d] px-4 text-white"
            autoComplete="cc-csc"
            placeholder="CVC"
            type="text"
            pattern="\d*"
            maxLength={3}
          />
        </div>
        <p className="self-stretch flex font-inter text-[14.5px] leading-[1.32px] text-left text-[#b0b0b0]">
          By providing your card information, you allow us to charge your card for future payments
          in accordance with their terms.
        </p>
      </div>
    </>
  )
}
