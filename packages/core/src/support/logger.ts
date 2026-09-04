// The core has no globals of its own: no `console`, no `crypto`, no `Date.now()` called
// straight from library code. Everything ambient is injected, which is what makes the
// engine and every plugin runnable - and assertable - inside a plain Node test.

export interface Logger {
  debug(message: string, detail?: Readonly<Record<string, unknown>>): void
  warn(message: string, detail?: Readonly<Record<string, unknown>>): void
  error(message: string, detail?: Readonly<Record<string, unknown>>): void
}

/** Default logger: says nothing. A host that wants output passes its own. */
export const silentLogger: Logger = {
  debug: () => {},
  warn: () => {},
  error: () => {},
}
