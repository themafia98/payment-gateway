/**
 * Joins class names. Not clsx, not tailwind-merge: the kit ships plain classes that never
 * conflict, so a dependency to resolve conflicts would earn its weight in nothing.
 *
 * Takes anything, so `cond && "x"` works whatever `cond` is.
 */
export const cx = (...values: unknown[]): string =>
  values.filter((value): value is string => typeof value === 'string' && value !== '').join(' ')
