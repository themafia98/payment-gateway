import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PaymentActionHost, useCheckoutEngine } from '@checkout-kit/react'
import {
  ActionFrame,
  CheckoutForm,
  ErrorText,
  PaymentButton,
  PaymentStatus,
  Section,
  StickyActions,
} from '@checkout-kit/ui'
import type { Plan } from '@/entities/plan'
import type { PaymentResult } from '@/entities/payment'
import { checkoutSchemaFor, type CheckoutFormInput, type CheckoutFormSchema } from '../model/schema'
import { formDefaultValues } from '../model/default-values'
import {
  useCheckoutAction,
  useCheckoutCapabilities,
  useCheckoutError,
  useCheckoutIsLocked,
  useCheckoutState,
} from '../store/checkout.selectors'
import { CardDetails } from './card-fields'
import { BillingFields } from './billing-fields'
import { PlanSelector } from './plan-selector'
import { OrderSummary } from './order-summary'
import { SimulateBankApp } from './simulate-bank-app'

interface PaymentFormProps {
  plans: Plan[]
}

export const PaymentForm = ({ plans }: PaymentFormProps) => {
  const engine = useCheckoutEngine()
  const navigate = useNavigate()

  // Everything about the payment comes from the store, which is the engine projected once.
  const state = useCheckoutState()
  const capabilities = useCheckoutCapabilities()
  const action = useCheckoutAction()
  const error = useCheckoutError()
  const isLocked = useCheckoutIsLocked()

  // Whether this provider wants a card at all - a hosted page collects it elsewhere. Until
  // the plugin has loaded, assume the common case.
  const collectsCard = capabilities?.instruments.includes('card') ?? true

  const methods = useForm<CheckoutFormInput, unknown, CheckoutFormSchema>({
    resolver: zodResolver(checkoutSchemaFor(collectsCard)),
    defaultValues: { ...formDefaultValues, planId: plans[0]?.id ?? '' },
    // Tell the shopper when they leave a field, then keep up as they fix it. The default
    // says nothing until the pay button is pressed.
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  // One key per attempt, so a submit that slips past every guard is a no-op at the provider
  // rather than a second charge.
  const idempotencyKey = useRef<string>(crypto.randomUUID())

  useEffect(() => {
    engine.reset()
  }, [engine])

  const settle = (result: PaymentResult) => {
    if (result.status === 'succeeded') {
      void navigate({ to: '/summary/success', search: { intentId: result.intent.id } })
      return
    }

    // A new attempt is a new key: the last one is spent.
    idempotencyKey.current = crypto.randomUUID()
  }

  const pay: SubmitHandler<CheckoutFormSchema> = async (form) => {
    const result = await engine.pay({
      input: { planId: form.planId },
      // No card is a normal instrument: it is what a hosted provider expects.
      instrument: form.card ? { kind: 'card', ...form.card } : { kind: 'none' },
      idempotencyKey: idempotencyKey.current,
    })

    if (result.status === 'requires_action') {
      const { surface } = result.action

      // Nothing of ours to render: a redirect leaves by itself, a wallet draws its own
      // sheet. Staying here also means a decline lands back on the form.
      if (surface === 'top' || surface === 'none') {
        settle(await engine.runPendingAction())
        return
      }

      // Fields and codes belong where the shopper is already looking.
      if (surface === 'inline') return

      void navigate({
        to: '/payment/action/$actionId',
        params: { actionId: result.action.id },
        search: { intentId: result.intent.id },
      })
      return
    }

    settle(result)
  }

  const uiState = methods.formState.isSubmitting ? 'submitting' : state

  return (
    <FormProvider {...methods}>
      <CheckoutForm
        // Returning the promise is what makes RHF track the submission - and what makes its
        // own re-entrancy guard work.
        onSubmit={(event) => void methods.handleSubmit(pay)(event)}
        actions={
          <StickyActions>
            {/* One announcement each: the status region carries progress, the alert
                carries the issuer wording. Both saying it would read it out twice. */}
            {uiState === 'failure' ? null : <PaymentStatus state={uiState} />}
            <ErrorText>{error?.message}</ErrorText>
            <PaymentButton state={uiState} disabled={isLocked}>
              Continue payment
            </PaymentButton>
          </StickyActions>
        }
      >
        <Section>
          <PlanSelector plans={plans} />
        </Section>

        {collectsCard ? (
          <Section>
            <CardDetails />
          </Section>
        ) : null}

        {action?.surface === 'inline' ? (
          <Section>
            <ActionFrame variant={action.kind === 'display' ? 'content' : 'inline'}>
              <PaymentActionHost onSettled={settle} className="ck-action-host" />
            </ActionFrame>
            <SimulateBankApp />
          </Section>
        ) : null}

        <Section>
          <BillingFields />
        </Section>

        <Section>
          <OrderSummary plans={plans} />
        </Section>
      </CheckoutForm>
    </FormProvider>
  )
}
