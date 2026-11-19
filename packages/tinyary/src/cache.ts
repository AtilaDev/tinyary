export interface CacheOptions {
  /** Milisegundos de vida. Sin ttl, la entrada no expira. */
  ttl?: number
  tags?: string[]
}

export interface Cache {
  get<T>(key: string, opts: CacheOptions, fn: () => Promise<T>): Promise<T>
  set<T>(key: string, value: T, opts?: CacheOptions): void
  invalidate(tag: string): void
  clear(): void
}

interface Entry {
  value: unknown
  /** `null` = no expira. */
  expiresAt: number | null
  tags: string[]
}

export function createCache(): Cache {
  const entries = new Map<string, Entry>()

  const isFresh = (entry: Entry): boolean =>
    entry.expiresAt === null || Date.now() < entry.expiresAt

  const set = <T>(key: string, value: T, opts: CacheOptions = {}): void => {
    entries.set(key, {
      value,
      expiresAt: opts.ttl === undefined ? null : Date.now() + opts.ttl,
      tags: opts.tags ?? [],
    })
  }

  return {
    async get<T>(key: string, opts: CacheOptions, fn: () => Promise<T>): Promise<T> {
      const entry = entries.get(key)

      if (entry && isFresh(entry)) return entry.value as T

      // DECISIÓN: no se deduplican llamadas concurrentes; el spec no lo pide.
      const value = await fn()
      set(key, value, opts)
      return value
    },

    set,

    invalidate(tag: string): void {
      for (const [key, entry] of entries) {
        if (entry.tags.includes(tag)) entries.delete(key)
      }
    },

    clear(): void {
      entries.clear()
    },
  }
}
