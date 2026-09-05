import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Field, FieldGroup } from './field'
import { Input } from './input'

afterEach(cleanup)

const renderField = (props: Partial<Parameters<typeof Field>[0]> = {}) =>
  render(
    <Field label="Card number" {...props}>
      {(control) => <Input {...control} placeholder="0000 0000 0000 0000" />}
    </Field>,
  )

describe('Field', () => {
  it('names the control, so it can be found by its label', () => {
    renderField()

    // The checkout this replaces had placeholder-only inputs, which a screen reader
    // announces as nothing at all.
    expect(screen.getByLabelText('Card number')).toBeDefined()
  })

  it('reads the hint out with the control', () => {
    renderField({ hint: 'The 16 digits on the front' })

    const input = screen.getByLabelText('Card number')
    const describedBy = input.getAttribute('aria-describedby')

    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)?.textContent).toBe('The 16 digits on the front')
  })

  it('marks the control invalid and points it at the error', () => {
    renderField({ error: 'Check the number and try again' })

    const input = screen.getByLabelText('Card number')

    expect(input.getAttribute('aria-invalid')).toBe('true')
    const describedBy = input.getAttribute('aria-describedby')!
    expect(document.getElementById(describedBy)?.textContent).toBe('Check the number and try again')
  })

  it('keeps the hint and the error together in the description', () => {
    renderField({ hint: 'The 16 digits on the front', error: 'Check the number' })

    const ids = screen.getByLabelText('Card number').getAttribute('aria-describedby')!.split(' ')

    expect(ids).toHaveLength(2)
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual([
      'The 16 digits on the front',
      'Check the number',
    ])
  })

  it('announces an error politely, not as an alert', () => {
    // The one assertive region on a checkout belongs to the payment. A field that shouts on
    // every keystroke drowns it out.
    renderField({ error: 'Check the number' })

    const error = screen.getByText('Check the number')

    expect(error.getAttribute('role')).toBe('status')
    expect(error.getAttribute('aria-live')).toBe('polite')
  })

  it('says nothing about validity when there is no error', () => {
    renderField()

    const input = screen.getByLabelText('Card number')

    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(input.getAttribute('aria-describedby')).toBeNull()
  })

  it('marks a required field required, and an optional one optional', () => {
    const { unmount } = renderField({ required: true })
    expect(screen.getByLabelText('Card number').hasAttribute('required')).toBe(true)
    unmount()

    renderField({ optionalText: '(optional)' })
    expect(screen.getByText('(optional)')).toBeDefined()
  })

  it('gives every field its own ids', () => {
    render(
      <>
        <Field label="One">{(control) => <Input {...control} />}</Field>
        <Field label="Two">{(control) => <Input {...control} />}</Field>
      </>,
    )

    expect(screen.getByLabelText('One').id).not.toBe(screen.getByLabelText('Two').id)
  })
})

describe('FieldGroup', () => {
  it('groups fields under one question', () => {
    render(
      <FieldGroup legend="Billing address">
        <Field label="Country">{(control) => <Input {...control} />}</Field>
      </FieldGroup>,
    )

    expect(screen.getByRole('group', { name: 'Billing address' })).toBeDefined()
  })
})
