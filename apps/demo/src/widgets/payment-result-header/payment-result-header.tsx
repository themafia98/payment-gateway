import { Header, Failure, Success, Status } from '@/shared/ui'

interface IProps {
  isSuccess?: boolean
}

const setup = {
  success: {
    heading: 'Payment Successful!',
    details: 'Thank you for your payment. Your transaction has been completed successfully.',
  },
  failure: {
    heading: 'Payment Failed',
    details:
      'Unfortunately, your payment could not be completed. Please try again or use a different payment method.',
  },
}

export const PaymentResultHeader = ({ isSuccess = false }: IProps) => {
  const statusSetup = isSuccess ? setup.success : setup.failure

  return (
    <Header center column>
      {isSuccess ? <Success /> : <Failure />}
      <Status
        variant={isSuccess ? 'success' : 'failure'}
        heading={statusSetup.heading}
        details={statusSetup.details}
      />
    </Header>
  )
}
