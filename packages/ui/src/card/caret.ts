/** Digits before the caret - the one thing that survives reformatting. */
export const digitsBefore = (value: string, caret: number): number =>
  value.slice(0, caret).replace(/\D/g, '').length

/** Where the caret goes so that `count` digits sit in front of it. */
export const caretAfterDigits = (formatted: string, count: number): number => {
  if (count <= 0) return 0

  let seen = 0
  for (let index = 0; index < formatted.length; index += 1) {
    if (formatted.charCodeAt(index) >= 48 && formatted.charCodeAt(index) <= 57) {
      seen += 1
      if (seen === count) return index + 1
    }
  }

  return formatted.length
}
