// The core calls no globals of its own - no console, no crypto, no clock. They are passed
// in, which is what makes the engine and every plugin testable in plain Node.

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
