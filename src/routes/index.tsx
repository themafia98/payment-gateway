import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <main className="min-h-[100svh] bg-gradient-to-br from-[#06040a] via-[#10091c] to-[#2a0f46]">
      <div className="flex h-[100%] flex-col items-stretch justify-start gap-6 bg-[rgba(21,12,37,0.85)] p-[30.8px] backdrop-blur-[15.4px]">
        <section className="flex flex-col gap-4">
          <label className="self-stretch flex font-inter text-[23.1px] text-left text-[#b0b0b0]">
            Choose your plan
          </label>

          <div className="flex flex-col gap-4">
            {/* item 1 */}
            <div className="flex h-[66.6px] flex-row items-center justify-between gap-[15.4px] self-stretch rounded-[10.3px] border-2 border-solid border-gray-500 bg-transparent px-[15.4px]">
              <div className="flex gap-[16px]">
                <div className="flex h-[28.2px] w-[28.2px] rounded-[64.1px] border-2 border-white bg-transparent pb-[8.4px] pl-[7.2px] pr-[6.6px] pt-[8.4px]"></div>
                <p className="w-[67px] h-7 flex font-inter text-[23.1px] text-left text-[#e9e9e9]">
                  Yearly
                </p>
              </div>
              <div className="flex gap-[16px]">
                <p className="h-7 flex font-inter text-[23.1px] text-left text-[#b0b0b0]">
                  $25/month
                </p>
              </div>
            </div>

            {/* item 2 */}
            <div className="flex h-[66.6px] flex-row items-center justify-between gap-[15.4px] self-stretch rounded-[10.3px] border-2 border-solid border-white bg-transparent px-[15.4px]">
              <div className="flex gap-[16px]">
                <div className="flex h-[28.2px] w-[28.2px] rounded-[64.1px] bg-[#fff] pb-[8.4px] pl-[7.2px] pr-[6.6px] pt-[8.4px]"></div>
                <p className="w-[67px] h-7 flex font-inter text-[23.1px] text-left text-[#e9e9e9]">
                  Yearly
                </p>
              </div>
              <div className="flex gap-[16px]">
                <div className="flex h-[27.1px] w-[63.5px] flex-row items-center justify-center rounded-[70.5px] bg-[#dad2ff] px-[10.3px] py-[2.6px]">
                  -32%
                </div>
                <p className="h-7 flex font-inter text-[23.1px] text-left text-[#b0b0b0]">
                  $120/year
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex h-[76.5px] flex-row items-stretch justify-start gap-4 self-stretch rounded-[10.5px] bg-[#3d3d3d] p-[5.9px]">
            <div className="flex flex-1 flex-row items-center justify-center gap-[7.9px] self-stretch rounded-[10.5px] bg-[#4f4f4f] px-[20.5px] shadow-[0_0_5.2px_5.9px_rgba(65,65,65,0.07)]">
              <p className="flex font-inter text-[23.1px] text-left text-[#e9e9e9]">Card</p>
            </div>

            <div className="flex flex-1 flex-row items-center justify-center gap-[7.9px] self-stretch rounded-[10.5px] bg-[#3d3d3d] px-[20.5px] shadow-[0_0_5.2px_5.9px_rgba(65,65,65,0.07)]">
              <p className="flex font-inter text-[23.1px] text-left text-[#e9e9e9]">
                Bank Transfer
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
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
              By providing your card information, you allow us to charge your card for future
              payments in accordance with their terms.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <label className="self-stretch flex font-inter text-[23.1px] text-left text-[#b0b0b0]">
            Credit card details
          </label>

          <div className="flex flex-col gap-2">
            <select className="flex h-[66.6px] flex-row items-center justify-between self-stretch rounded-[10.3px] bg-[#3d3d3d] px-4 text-white">
              <option>USA</option>
            </select>
            <input
              className="flex h-[66.6px] flex-row items-center justify-between self-stretch rounded-[10.3px] bg-[#3d3d3d] px-4 text-white"
              placeholder="Postal code"
            />
          </div>
        </section>

        <div data-name="CTA" className="flex flex-col">
          <div data-name="Details billing" className="flex h-33 flex-col gap-4">
            <div data-name="details" className="flex justify-between gap-[62px]">
              <p data-name="Price" className="text-[26px] text-[#B0B0B0]">
                Price
              </p>
              <p data-name="$144" className="text-[26px] text-[#B0B0B0]">
                $144
              </p>
            </div>
            <div data-name="details" className="flex justify-between gap-[62px]">
              <p data-name="Discount" className="text-[26px] text-[#B0B0B0]">
                Discount
              </p>
              <p data-name="-$24" className="text-[26px] text-[#B0B0B0]">
                -$24
              </p>
            </div>
            <div data-name="details" className="flex justify-between gap-[62px]">
              <p data-name="Total due" className="text-[31.235864639282227px] text-[#E9E9E9]">
                Total due
              </p>
              <p data-name="$120" className="text-[31.235864639282227px] text-[#E9E9E9]">
                $120
              </p>
            </div>
          </div>
          <button
            data-name="Button"
            className="flex h-[90.2369384765625px] cursor-pointer items-center justify-center gap-[197.82713317871094px] rounded-[13.882606506347656px] px-[27.765213012695312px] py-0 bg-purple-500 shadow-[inset_5.205977439880371px_6.941303253173828px_36.61537551879883px_rgba(255,255,255,0.25)]"
          >
            <p
              data-name="Continue payment"
              className="text-[31.235864639282227px] font-medium text-[#E9E9E9]"
            >
              Continue payment
            </p>
          </button>
        </div>
      </div>
    </main>
  )
}
