import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCache } from '../src/cache'

describe('createCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('llama una sola vez dentro del TTL', async () => {
    const cache = createCache()
    const fn = vi.fn(async () => 'valor')

    expect(await cache.get('k', { ttl: 1000 }, fn)).toBe('valor')
    vi.advanceTimersByTime(999)
    expect(await cache.get('k', { ttl: 1000 }, fn)).toBe('valor')

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('vuelve a llamar pasado el TTL', async () => {
    const cache = createCache()
    const fn = vi.fn(async () => 'valor')

    await cache.get('k', { ttl: 1000 }, fn)
    vi.advanceTimersByTime(1001)
    await cache.get('k', { ttl: 1000 }, fn)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('no expira cuando no se pasa ttl', async () => {
    const cache = createCache()
    const fn = vi.fn(async () => 'valor')

    await cache.get('k', {}, fn)
    vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 365)
    await cache.get('k', {}, fn)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('invalidate limpia sólo las keys con ese tag', async () => {
    const cache = createCache()
    const listings = vi.fn(async () => 'listings')
    const users = vi.fn(async () => 'users')

    await cache.get('listings', { tags: ['listings'] }, listings)
    await cache.get('users', { tags: ['users'] }, users)

    cache.invalidate('listings')

    await cache.get('listings', { tags: ['listings'] }, listings)
    await cache.get('users', { tags: ['users'] }, users)

    expect(listings).toHaveBeenCalledTimes(2)
    expect(users).toHaveBeenCalledTimes(1)
  })

  it('invalidate respeta múltiples tags por entrada', async () => {
    const cache = createCache()
    const fn = vi.fn(async () => 'valor')

    await cache.get('k', { tags: ['a', 'b'] }, fn)
    cache.invalidate('b')
    await cache.get('k', { tags: ['a', 'b'] }, fn)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('clear limpia todo', async () => {
    const cache = createCache()
    const a = vi.fn(async () => 'a')
    const b = vi.fn(async () => 'b')

    await cache.get('a', {}, a)
    await cache.get('b', {}, b)
    cache.clear()
    await cache.get('a', {}, a)
    await cache.get('b', {}, b)

    expect(a).toHaveBeenCalledTimes(2)
    expect(b).toHaveBeenCalledTimes(2)
  })

  it('set permite pre-cargar una entrada', async () => {
    const cache = createCache()
    const fn = vi.fn(async () => 'calculado')

    cache.set('k', 'precargado', { tags: ['x'] })

    expect(await cache.get('k', {}, fn)).toBe('precargado')
    expect(fn).not.toHaveBeenCalled()
  })

  it('set respeta el ttl', async () => {
    const cache = createCache()
    const fn = vi.fn(async () => 'calculado')

    cache.set('k', 'precargado', { ttl: 500 })
    vi.advanceTimersByTime(501)

    expect(await cache.get('k', {}, fn)).toBe('calculado')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
