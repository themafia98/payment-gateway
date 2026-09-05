// The app's UI facade.
//
// Anything a checkout genuinely needs comes from @pg/ui, the kit that ships with the
// packages; what is left here is this demo's own furniture - its layout, its icons, its
// wordmark. Re-exporting rather than importing the kit everywhere keeps that split from
// leaking into every component.
export { Button, Details, ErrorText, Input, Item, Section, Tab, Tabs } from '@pg/ui'
export type { ButtonProps, InputProps, ItemProps, TabProps } from '@pg/ui'

export * from './bubble'
export * from './chip'
export * from './error-message'
export * from './containers/center'
export * from './containers/header'
export * from './containers/main'
export * from './containers/pending'
export * from './icons/back'
export * from './icons/download'
export * from './icons/failure'
export * from './icons/success'
export * from './text/form-detail'
export * from './text/label'
export * from './text/status'
