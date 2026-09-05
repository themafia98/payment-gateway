/**
 * Joins class names. Not clsx, not tailwind-merge: the kit ships plain classes that never
 * conflict, so a dependency to resolve conflicts would earn its weight in nothing.
 */
export const cx = (...values: (string | false | null | undefined)[]): string =>
  values.filter(Boolean).join(' ')
