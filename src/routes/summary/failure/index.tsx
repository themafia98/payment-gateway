import {createFileRoute, useNavigate} from '@tanstack/react-router'

export const Route = createFileRoute('/summary/failure/')({
  component: FailurePage,
})

function FailurePage() {
  const navigate = useNavigate()

  return (
      <main className="min-h-[100svh] bg-gradient-to-br from-[#06040a] via-[#10091c] to-[#2a0f46]">
        <div className="p-8 text-center space-y-6 min-h-[100svh] gap-6">
          <header className="flex justify-center relative">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="128"
                height="128"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-circle-x w-28 h-28 text-red-500"
                aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m15 9-6 6"></path>
              <path d="m9 9 6 6"></path>
            </svg>
          </header>

          <section className="space-y-2">
            <h2 className="text-red-500">Payment Failed</h2>
            <p className="text-lg text-gray-300">
              Unfortunately, your payment could not be completed. Please try again or use a different payment method.
            </p>
          </section>

          <section className="bg-[#3d3d3d] rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-white items-center gap-2">
              <span>Amount</span>
              <span>$100.00</span>
            </div>

            <div className="flex justify-between text-white items-center gap-2">
              <span>Payment Method</span>
              <span>**** 4242</span>
            </div>

            <div className="flex justify-between text-white items-center gap-2">
              <span>Status</span>
              <span className="text-red-400">Failed</span>
            </div>

            <div className="flex justify-between text-white items-center gap-2">
              <span>Reason</span>
              <span>Payment declined</span>
            </div>

            <div className="flex justify-between text-white items-center gap-2">
              <span>Transaction ID</span>
              <span>TXN-789123456</span>
            </div>

            <div className="flex justify-between text-white items-center gap-2">
              <span>Date</span>
              <span>Dec 15, 2024</span>
            </div>
          </section>

          <section className="space-y-4">
            <button
                onClick={() => navigate({ to: "/" })}
                data-name="Button"
                className="flex w-full h-10 cursor-pointer items-center justify-center rounded-[14px] px-[27.765213012695312px] py-0 text-white bg-red-500"
            >
              Try Again
            </button>
          </section>
        </div>
      </main>
  )
}
