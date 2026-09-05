// Which plugins this checkout can use. A registration is a config plus a loader, and the
// loader can be a direct reference or a dynamic import - both take the same path.

import type {
  PaymentProvider,
  PaymentProviderInstance,
  ProviderContext,
} from '../provider/provider'

export type ProviderModule<TConfig> =
  PaymentProvider<TConfig> | { default: PaymentProvider<TConfig> }

export interface ProviderRegistration<TConfig = unknown> {
  readonly id: string
  readonly config: TConfig
  readonly load: () => ProviderModule<TConfig> | Promise<ProviderModule<TConfig>>
  /** Load during `createCheckout` instead of on first use. */
  readonly eager?: boolean
}

/**
 * Where plugins announce the config they need. A plugin augments this interface, so a host
 * gets its id and config checked without importing the plugin's code:
 *
 * ```ts
 * declare module '@checkout-kit/core' {
 *   interface ProviderConfigRegistry {
 *     acquiring: AcquiringConfig
 *   }
 * }
 * ```
 */
export interface ProviderConfigRegistry {}

export type KnownProviderId = keyof ProviderConfigRegistry & string

export type ConfigOf<Id extends KnownProviderId> = ProviderConfigRegistry[Id]

/**
 * Declares one provider for `createCheckout`. A function rather than a type on the array,
 * so the id and the config are checked against each other right here.
 */
export const defineProvider = <Id extends KnownProviderId>(registration: {
  readonly id: Id
  readonly config: ConfigOf<Id>
  readonly load: () => ProviderModule<ConfigOf<Id>> | Promise<ProviderModule<ConfigOf<Id>>>
  readonly eager?: boolean
}): ProviderRegistration => registration as ProviderRegistration

export interface LoadedProvider {
  readonly provider: PaymentProvider<unknown>
  readonly instance: PaymentProviderInstance
}

export interface ProviderRegistry {
  readonly ids: readonly string[]
  has(id: string): boolean
  /** Loads the plugin if needed, then returns its live instance. Memoized per id. */
  load(id: string): Promise<LoadedProvider>
  /** Already-loaded plugin, or `null`. Never triggers a load. */
  peek(id: string): LoadedProvider | null
}

const unwrap = <TConfig>(module: ProviderModule<TConfig>): PaymentProvider<TConfig> =>
  'default' in module ? module.default : module

export interface ProviderRegistryConfig {
  readonly registrations: readonly ProviderRegistration[]
  readonly createContext: (config: unknown) => ProviderContext<unknown>
  /** Called once per plugin, right after it loads - the place capability checks belong. */
  readonly onLoaded?: (provider: PaymentProvider<unknown>) => void
}

export const createProviderRegistry = (config: ProviderRegistryConfig): ProviderRegistry => {
  const byId = new Map(config.registrations.map((registration) => [registration.id, registration]))
  const loaded = new Map<string, LoadedProvider>()
  const loading = new Map<string, Promise<LoadedProvider>>()

  const loadOnce = async (id: string): Promise<LoadedProvider> => {
    const registration = byId.get(id)
    if (!registration) {
      throw new Error(
        `Unknown payment provider "${id}". Registered: ${[...byId.keys()].join(', ') || '(none)'}.`,
      )
    }

    const provider = unwrap(await registration.load())
    if (provider.id !== id) {
      throw new Error(
        `Provider registered as "${id}" reports its own id as "${provider.id}". ` +
          `The registration id is what persists across a redirect, so the two must match.`,
      )
    }

    config.onLoaded?.(provider)
    const entry: LoadedProvider = {
      provider,
      instance: provider.create(config.createContext(registration.config)),
    }
    loaded.set(id, entry)
    return entry
  }

  return {
    ids: [...byId.keys()],

    has: (id) => byId.has(id),

    peek: (id) => loaded.get(id) ?? null,

    load: (id) => {
      const ready = loaded.get(id)
      if (ready) return Promise.resolve(ready)

      // Concurrent callers must share one import, not race two module instances.
      const pending = loading.get(id)
      if (pending) return pending

      const started = loadOnce(id).finally(() => loading.delete(id))
      loading.set(id, started)
      return started
    },
  }
}
