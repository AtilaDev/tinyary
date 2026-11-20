// lib/cache.ts
//
// Rol: cache en memoria con LRU eviction. Útil para cachear resultados
// de loaders costosos. El cache vive en memoria del proceso (se pierde al
// reiniciar).

import { LRUCache } from 'lru-cache'

export const cache = new LRUCache<string, any>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutos
})

// Helper: getOrSet
export async function getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
  const cached = cache.get(key)
  if (cached !== undefined) return cached as T
  const value = await fn()
  cache.set(key, value, { ttl })
  return value
}
