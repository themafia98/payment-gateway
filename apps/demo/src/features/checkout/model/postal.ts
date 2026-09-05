// Enough to catch a typo in the countries this demo lists. A full table belongs on the
// server, where it can be updated without a release.
const PATTERNS: Record<string, RegExp> = {
  US: /^\d{5}(-\d{4})?$/,
  CA: /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/,
  GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  ES: /^\d{5}$/,
  IT: /^\d{5}$/,
  NL: /^\d{4} ?[A-Za-z]{2}$/,
  PL: /^\d{2}-\d{3}$/,
  BR: /^\d{5}-?\d{3}$/,
  JP: /^\d{3}-?\d{4}$/,
}

const ANY = /^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/

export const isPostalCode = (country: string, value: string): boolean =>
  (PATTERNS[country.toUpperCase()] ?? ANY).test(value.trim())
