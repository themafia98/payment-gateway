// One signal that fires when any of several do.
//
// `AbortSignal.any` does this, and it landed in Safari 17.4 - March 2024. A phone two
// versions behind still buys things, so there is a fallback.

/** Aborts as soon as any of the given signals aborts. */
export const anySignal = (signals: readonly AbortSignal[]): AbortSignal => {
  const already = signals.find((signal) => signal.aborted)
  if (already) return already

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([...signals])
  }

  const controller = new AbortController()
  const abort = (event: Event) => {
    controller.abort((event.target as AbortSignal).reason)
    for (const signal of signals) signal.removeEventListener('abort', abort)
  }
  for (const signal of signals) signal.addEventListener('abort', abort, { once: true })

  return controller.signal
}
