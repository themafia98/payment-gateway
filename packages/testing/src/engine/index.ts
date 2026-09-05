// Test doubles for the engine: scripted runners in place of a browser, and a plugin with
// no network behind it. Kept out of the package root so Playwright specs, which only want
// the card table, never pull @checkout-kit/core in.

export * from './fake-provider'
export * from './scripted-runners'
