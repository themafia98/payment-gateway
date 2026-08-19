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
            <div className="h-[66.6px] self-stretch flex flex flex-row justify-between items-center px-[15.4px] gap-[15.4px] rounded-[10.3px] border-2 border-grey border-solid bg-[transparent]">
              <div className="flex gap-[16px]">
                <div className="w-[28.2px] h-[28.2px] flex pt-[8.4px] pr-[6.6px] pb-[8.4px] pl-[7.2px] rounded-[64.1px] border-white border-2 bg-trasparent"></div>
                <p className="w-[67px] h-7 flex font-inter text-[23.1px] text-left text-[#e9e9e9]">
                  Yearly
                </p>
              </div>
              <div className="flex gap-[16px]">
                <p className="h-7 flex font-inter text-[23.1px] text-left text-[#b0b0b0]">$25/month</p>
              </div>
            </div>

            {/* item 2 */}
            <div className="h-[66.6px] self-stretch flex flex flex-row justify-between items-center px-[15.4px] gap-[15.4px] rounded-[10.3px] border-2 border-white border-solid bg-[transparent] border-solid">
              <div className="flex gap-[16px]">
                <div className="w-[28.2px] h-[28.2px] flex pt-[8.4px] pr-[6.6px] pb-[8.4px] pl-[7.2px] rounded-[64.1px] bg-[#fff]"></div>
                <p className="w-[67px] h-7 flex font-inter text-[23.1px] text-left text-[#e9e9e9]">
                  Yearly
                </p>
              </div>
              <div className="flex gap-[16px]">
                <div className="w-[63.5px] h-[27.1px] flex flex flex-row justify-center items-center py-[2.6px] ph-[10.3px] rounded-[70.5px] bg-[#dad2ff]">
                  -32%
                </div>
                <p className="h-7 flex font-inter text-[23.1px] text-left text-[#b0b0b0]">$120/year</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="h-[76.5px] gap-4 self-stretch flex flex flex-row justify-start items-stretch p-[5.9px] rounded-[10.5px] bg-[#3d3d3d]">
            <div className="self-stretch flex flex-1 flex-row justify-center items-center gap-[7.9px] ph-[20.5px] rounded-[10.5px] shadow-[0 0 5.2px 5.9px rgba(65, 65, 65, 0.07)] bg-[#4f4f4f]">
              <p className="flex font-inter text-[23.1px] text-left text-[#e9e9e9]">Card</p>
            </div>

            <div className="self-stretch flex flex-1 flex-row justify-center items-center gap-[7.9px] ph-[20.5px] rounded-[10.5px] shadow-[0 0 5.2px 5.9px rgba(65, 65, 65, 0.07)] bg-[#3d3d3d]">
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
              className="h-[66.6px] self-stretch flex flex flex-row justify-between items-center ph-[20.5px] rounded-[10.3px] text-white px-4 bg-[#3d3d3d]"
              placeholder="MM / YYYYY"
            />
            <div className="flex gap-2 pb-2">
              <input
                className="h-[66.6px] flex-1 self-stretch flex flex flex-row justify-between items-center ph-[20.5px] rounded-[10.3px] text-white px-4 bg-[#3d3d3d]"
                type="text"
                pattern="\d*"
                maxLength={16}
                placeholder="0000 0000 0000 0000"
              />
              <input
                className="h-[66.6px] flex-1 self-stretch flex flex flex-row justify-between items-center ph-[20.5px] rounded-[10.3px] text-white px-4 bg-[#3d3d3d]"
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
            <select className="h-[66.6px] self-stretch flex flex flex-row justify-between items-center ph-[20.5px] rounded-[10.3px] text-white px-4 bg-[#3d3d3d]">
              <option>USA</option>
            </select>
            <input
              className="h-[66.6px] self-stretch flex flex flex-row justify-between items-center ph-[20.5px] rounded-[10.3px] text-white px-4 bg-[#3d3d3d]"
              placeholder="Postal code"
            />
          </div>
        </section>

        <div data-name="CTA" className="flex flex-col">
          <div data-name="Details billing" className="flex flex-col gap-4 h-33">
            <div data-name="details" className="flex justify-between gap-[62px]]">
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
            className="flex py-0 cursor-pointer px-[27.765213012695312px] justify-center items-center gap-[197.82713317871094px] h-[90.2369384765625px] shadow-[inset_5.205977439880371px_6.941303253173828px_36.61537551879883px_rgba(255,255,255,0.25)] rounded-[13.882606506347656px]"
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
