import type { Branded } from '../types/brand'

export function createBranded<T, B>(value: T): Branded<T, B> {
  return value as Branded<T, B>
}
