import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  ActionFrame,
  AuthenticationState,
  Badge,
  Button,
  CardFields,
  CardholderInput,
  CardNumberInput,
  CvcInput,
  Details,
  ExpiryInput,
  Field,
  FailureState,
  Input,
  Item,
  OptionCard,
  OptionCardGroup,
  PaymentButton,
  PaymentMethodSelector,
  PaymentStatus,
  ProcessingState,
  Section,
  Spinner,
  SuccessState,
  Tab,
  Tabs,
} from '@checkout-kit/ui'
import type { PaymentUiState } from '@checkout-kit/core'
import { useState } from 'react'

// Every state and every component on one page, at whatever width the window is. Stands in
// for a component workshop: enough to review the system, nothing to maintain.

export const Route = createFileRoute('/dev/states')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  component: StatesPage,
})

const STATES: PaymentUiState[] = [
  'idle',
  'editing',
  'validating',
  'submitting',
  'processing',
  'requires_action',
  'success',
  'failure',
  'cancelled',
]

const Row = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3 border-t border-border-subtle pt-6">
    <h2 className="text-sm tracking-wide text-subtle uppercase">{title}</h2>
    {children}
  </section>
)

function StatesPage() {
  const [method, setMethod] = useState('card')
  const [tab, setTab] = useState('one')
  const [number, setNumber] = useState('')
  const [exp, setExp] = useState('')
  const [cvc, setCvc] = useState('')

  return (
    <div className="flex flex-col gap-8">
      <Row title="Payment states">
        <div className="flex flex-col gap-2">
          {STATES.map((state) => (
            <div key={state} className="flex items-center gap-3">
              <code className="w-36 text-sm text-muted">{state}</code>
              <PaymentStatus state={state} />
            </div>
          ))}
        </div>
      </Row>

      <Row title="Buttons">
        <PaymentButton state="idle">Continue payment</PaymentButton>
        <PaymentButton state="submitting">Continue payment</PaymentButton>
        <PaymentButton state="idle" disabled>
          Continue payment
        </PaymentButton>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <div className="flex items-center gap-3">
          <Spinner />
          <Spinner size="md" />
          <Badge>Visa</Badge>
          <Badge tone="accent">Instant</Badge>
        </div>
      </Row>

      <Row title="Fields">
        <Field label="Email" hint="Where the receipt goes" required>
          {(control) => <Input {...control} placeholder="you@example.com" />}
        </Field>
        <Field label="Postal code" error="Check the postal code for this country" required>
          {(control) => <Input {...control} placeholder="Postal code" />}
        </Field>
        <Field label="Company" optionalText="(optional)">
          {(control) => <Input {...control} />}
        </Field>
      </Row>

      <Row title="Card entry">
        <CardFields>
          <Field label="Card number" required>
            {(control) => <CardNumberInput {...control} value={number} onChange={setNumber} />}
          </Field>
          <Field label="Name on card" required>
            {(control) => <CardholderInput {...control} />}
          </Field>
          <div className="ck-card-fields__row">
            <Field label="Expiry date" hint="MM / YY" required>
              {(control) => <ExpiryInput {...control} value={exp} onChange={setExp} />}
            </Field>
            <Field label="Security code" required>
              {(control) => <CvcInput {...control} value={cvc} onChange={setCvc} />}
            </Field>
          </div>
        </CardFields>
      </Row>

      <Row title="Choices">
        <PaymentMethodSelector
          methods={[
            { id: 'card', label: 'Card', description: 'Visa, Mastercard, Amex' },
            { id: 'transfer', label: 'Bank transfer', badge: 'Instant' },
            { id: 'later', label: 'Pay later', disabled: true },
          ]}
          value={method}
          onChange={setMethod}
        />
        <OptionCardGroup label="Plan" value="monthly" onChange={() => {}}>
          <OptionCard value="monthly" label="Monthly" aside="$25" />
          <OptionCard value="yearly" label="Yearly" badge="Save 32%" aside="$125" />
        </OptionCardGroup>
        <Tabs aria-label="Example" value={tab} onValueChange={setTab}>
          <Tab value="one">One</Tab>
          <Tab value="two">Two</Tab>
          <Tab value="three">Three</Tab>
        </Tabs>
      </Row>

      <Row title="Screens">
        <ProcessingState />
        <AuthenticationState variant="inline" actions={<Button variant="ghost">Cancel</Button>}>
          <div className="grid h-full place-items-center text-muted">the provider draws here</div>
        </AuthenticationState>
        <SuccessState
          details={
            <Details>
              <Item name="Amount" value="$25.00" />
              <Item name="Transaction ID" value="pi_123" total />
            </Details>
          }
          actions={<Button variant="secondary">Return to store</Button>}
        >
          Thank you. Your payment has gone through.
        </SuccessState>
        <FailureState tone="declined" actions={<Button>Try again</Button>}>
          Your card has insufficient funds.
        </FailureState>
        <FailureState tone="cancelled" />
      </Row>

      <Row title="Action frames">
        <ActionFrame variant="content">
          <div className="p-6 text-center text-muted">content: sizes itself</div>
        </ActionFrame>
        <Section>
          <ActionFrame variant="inline">
            <div className="grid h-full place-items-center text-muted">inline</div>
          </ActionFrame>
        </Section>
      </Row>
    </div>
  )
}
