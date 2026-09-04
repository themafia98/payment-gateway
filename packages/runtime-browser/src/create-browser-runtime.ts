// Everything the engine needs that only exists in a browser, assembled in one place.
//
// The engine itself has no DOM, no storage and no idea what a URL bar is; this module
// supplies those as plain values, which is also why the same engine runs untouched inside
// a Node test with scripted runners.

import {
  createRunnerRegistry,
  type MountHandle,
  type RunnerRegistry,
  type StorageAdapter,
} from '@pg/core'
import {
  createCollectFieldsRunner,
  type CollectFieldsRunnerOptions,
} from './runners/collect-fields'
import { createRedirectRunner, type RedirectRunnerOptions } from './runners/redirect'
import { createSdkHandoffRunner, type SdkHandoffRunnerOptions } from './runners/sdk-handoff'
import { sessionStorageAdapter } from './storage/session-storage'

export interface BrowserRuntime {
  readonly runners: RunnerRegistry
  readonly storage: StorageAdapter
  /** Absolute URL a provider sends the browser back to after a full-page redirect. */
  readonly returnUrl: string
  /** Query parameters of the current page, for picking a redirected payment back up. */
  readReturnParams(): Record<string, string>
}

export interface BrowserRuntimeOptions {
  /**
   * Path the provider returns to, resolved against the current origin. Pass the app's
   * base path with it - a deployment under a sub-path is exactly where hand-built return
   * URLs go wrong.
   */
  readonly returnPath: string
  readonly redirect?: RedirectRunnerOptions
  readonly collectFields?: CollectFieldsRunnerOptions
  readonly sdk?: SdkHandoffRunnerOptions
  readonly storage?: StorageAdapter
}

export const createBrowserRuntime = (options: BrowserRuntimeOptions): BrowserRuntime => {
  const runners = createRunnerRegistry()
  runners.register(createRedirectRunner(options.redirect))
  runners.register(createCollectFieldsRunner(options.collectFields))
  runners.register(createSdkHandoffRunner(options.sdk))

  return {
    runners,
    storage: options.storage ?? sessionStorageAdapter(),
    returnUrl: new URL(options.returnPath, window.location.origin).toString(),
    readReturnParams: () => Object.fromEntries(new URL(window.location.href).searchParams),
  }
}

/** Wraps a DOM element so a runner can render into it without the engine knowing about it. */
export const createMount = (element: HTMLElement): MountHandle => ({
  element,
  release: () => {
    element.replaceChildren()
  },
})
