// Everything the engine needs that only a browser has, assembled in one place.

import {
  createRunnerRegistry,
  type MountHandle,
  type RunnerRegistry,
  type StorageAdapter,
} from '@checkout-kit/core'
import {
  createCollectFieldsRunner,
  type CollectFieldsRunnerOptions,
} from './runners/collect-fields'
import { createDisplayRunner, type DisplayRunnerOptions } from './runners/display'
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
  readonly display?: DisplayRunnerOptions
  readonly storage?: StorageAdapter
}

export const createBrowserRuntime = (options: BrowserRuntimeOptions): BrowserRuntime => {
  const runners = createRunnerRegistry()
  runners.register(createRedirectRunner(options.redirect))
  runners.register(createCollectFieldsRunner(options.collectFields))
  runners.register(createSdkHandoffRunner(options.sdk))
  runners.register(createDisplayRunner(options.display))

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
