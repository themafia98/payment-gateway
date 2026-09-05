interface IProps {
  onRetry: () => void
}

export const RetryPaymentButton = ({ onRetry }: IProps) => (
  <button
    onClick={onRetry}
    data-name="Button"
    className="flex w-full h-10 cursor-pointer items-center justify-center rounded-[14px] px-8 py-0 text-white bg-red-500"
  >
    Try Again
  </button>
)
