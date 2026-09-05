// Nominal types over `string`: a `CardNumber` is a string at runtime, but the compiler
// will not accept a raw one, so validation cannot be skipped by accident.

declare const __brand: unique symbol

type Brand<B> = { [__brand]: B }

export type Branded<T, B> = T & Brand<B>

export function createBranded<T, B>(value: T): Branded<T, B> {
  return value as Branded<T, B>
}

export type CardNumber = Branded<string, 'CardNumber'>

export type CardExpiration = Branded<string, 'CardExpiration'>

export type CvcCode = Branded<string, 'CvcCode'>
