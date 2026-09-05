// A full-page redirect throws the page away, so the little that is needed to pick the
// payment back up is written down first. Card data never goes in here.

export interface StorageAdapter {
  read(key: string): string | null
  write(key: string, value: string): void
  remove(key: string): void
}

export interface PendingCheckout {
  readonly providerId: string
  readonly intentId: string
  readonly actionId: string
  readonly idempotencyKey: string
  readonly startedAt: number
}

export const PENDING_CHECKOUT_KEY = 'pg:pending-checkout'

/** Used when no storage is available: the flow still works, minus redirect recovery. */
export const memoryStorage = (): StorageAdapter => {
  const values = new Map<string, string>()
  return {
    read: (key) => values.get(key) ?? null,
    write: (key, value) => {
      values.set(key, value)
    },
    remove: (key) => {
      values.delete(key)
    },
  }
}

const isPendingCheckout = (value: unknown): value is PendingCheckout =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as PendingCheckout).providerId === 'string' &&
  typeof (value as PendingCheckout).intentId === 'string' &&
  typeof (value as PendingCheckout).actionId === 'string'

export const readPendingCheckout = (storage: StorageAdapter): PendingCheckout | null => {
  const raw = storage.read(PENDING_CHECKOUT_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isPendingCheckout(parsed) ? parsed : null
  } catch {
    // Someone else's data under our key, or a truncated write. Ignore it.
    return null
  }
}

export const writePendingCheckout = (storage: StorageAdapter, pending: PendingCheckout): void => {
  storage.write(PENDING_CHECKOUT_KEY, JSON.stringify(pending))
}

export const clearPendingCheckout = (storage: StorageAdapter): void => {
  storage.remove(PENDING_CHECKOUT_KEY)
}
