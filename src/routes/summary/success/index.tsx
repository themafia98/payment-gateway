import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '../../../shared/ui/button.tsx'

export const Route = createFileRoute('/summary/success/')({
  component: SuccessPage,
})

function SuccessPage() {
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
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            className="lucide lucide-circle-check w-28  w-28 text-purple-500"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
        </header>
        <section className="space-y-2">
          <h2 className="text-purple-600">Payment Successful!</h2>
          <p className="text-lg text-gray-300">
            Thank you for your payment. Your transaction has been completed successfully.
          </p>
        </section>

        <section className="bg-[#3d3d3d] rounded-lg p-4 space-y-3">
          <div className="flex justify-between text-white items-center gap-2">
            <span>Amount</span>
            <span>$100.00</span>
          </div>
          <div className="flex justify-between text-white items-center gap-2">
            <span>Transaction ID</span>
            <span>TXN-789123456</span>
          </div>
          <div className="flex justify-between text-white items-center gap-2">
            <span>Payment Method</span>
            <span>**** 4242</span>
          </div>
          <div className="flex justify-between text-white items-center gap-2">
            <span>Date</span>
            <span>Dec 15, 2024</span>
          </div>
          <div className="flex justify-between text-white items-center gap-2">
            <span>Merchant</span>
            <span>Store Pro</span>
          </div>
        </section>

        <section className="space-y-4">
          <Button
            type="button"
            onClick={() => console.log('download')}
            leftIcon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-download w-4 h-4 mr-2"
                aria-hidden="true"
              >
                <path d="M12 15V3"></path>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <path d="m7 10 5 5 5-5"></path>
              </svg>
            }
            className="h-12"
          >
            Download Receipt
          </Button>
          <Button
            type="button"
            leftIcon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-arrow-left w-4 h-4 mr-2"
                aria-hidden="true"
              >
                <path d="m12 19-7-7 7-7"></path>
                <path d="M19 12H5"></path>
              </svg>
            }
            onClick={() => navigate({ to: '/' })}
            variant="secondary"
            className="h-12"
          >
            Return To Store
          </Button>
        </section>
      </div>
    </main>
  )
}
