// The card table is the vocabulary every provider is exercised with: the same PAN must
// mean the same outcome no matter which integration is under test. It carries no MSW
// dependency on purpose, so Playwright specs can import it without pulling in a backend.

export * from './test-cards'
export * from './scenarios'
