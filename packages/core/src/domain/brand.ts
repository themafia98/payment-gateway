// Nominal typing on top of `string`. A `CardNumber` is a string at runtime, but the
// compiler refuses to accept a raw string where one is expected, so validation cannot be
// skipped by accident. Brands are minted once, at the edge that validates the value.

declare const __brand: unique symbol

type Brand<B> = { [__brand]: B }

export type Branded<T, B> = T & Brand<B>

export function createBranded<T, B>(value: T): Branded<T, B> {
  return value as Branded<T, B>
}

export type CardNumber = Branded<string, 'CardNumber'>

export type CardExpiration = Branded<string, 'CardExpiration'>

export type CvcCode = Branded<string, 'CvcCode'>
