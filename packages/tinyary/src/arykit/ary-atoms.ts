import { useSyncExternalStore } from 'preact/compat'

declare const __DEV__: boolean | undefined

export type AryAtom<T> = symbol & { __type?: T }

type Subscriber = (value: unknown) => void
type DebugSubscriber = () => void

// Valores y suscriptores por átomo. El símbolo es la identidad pública.
const subscribers = new Map<symbol, Set<Subscriber>>()
const aryValues = new Map<symbol, unknown>()

// Clave estable para listas (dos átomos pueden compartir debugLabel).
const atomKeys = new Map<symbol, string>()
let nextAtomKey = 0

// Metadatos de persistencia y etiquetas para DevTools.
const persistenceKeys = new Map<symbol, string>()
const atomLabels = new Map<symbol, string>()
const atomStorage = new Map<symbol, AryStorage>()

// Valores iniciales para reset.
const initialValues = new Map<symbol, unknown>()

// Historial por átomo (sólo en desarrollo).
const atomHistory = new Map<symbol, HistoryEntry[]>()

// Suscriptores globales para DevTools.
const debugSubscribers = new Set<DebugSubscriber>()

function notifyDebug() {
  debugSubscribers.forEach((callback) => callback())
}

export interface AryStorage {
  getItem: (key: string) => string | null | Promise<string | null>
  setItem: (key: string, value: string) => void | Promise<void>
  removeItem: (key: string) => void | Promise<void>
}

export interface AryOptions {
  /** Clave de persistencia. Sin esto el átomo vive sólo en memoria. */
  persist?: string
  /** Nombre visible en DevTools. */
  debugLabel?: string
  /** Storage propio; si no, se usa el global o `localStorage`. */
  storage?: AryStorage
}

export type HistoryEntry = {
  timestamp: number
  value: unknown
}

let globalStorage: AryStorage | undefined

function getDefaultStorage(): AryStorage | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined

    return {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
      removeItem: (key) => localStorage.removeItem(key),
    }
  } catch {
    // Algunos navegadores bloquean localStorage (modo privado, iframes).
    return undefined
  }
}

export function configureAry(config: { storage?: AryStorage }) {
  if (config.storage) {
    globalStorage = config.storage
  }
}

const isDev =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') ||
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? '[undefined]'
  } catch {
    return '[unserializable]'
  }
}

function addToHistory(aryId: symbol, value: unknown) {
  if (!isDev) return

  const entry: HistoryEntry = { timestamp: Date.now(), value }
  const history = atomHistory.get(aryId) ?? []
  const lastEntry = history[history.length - 1]

  if (!lastEntry || safeStringify(lastEntry.value) !== safeStringify(entry.value)) {
    atomHistory.set(aryId, [...history, entry].slice(-10))
  }
}

export function getAtomHistory(aryId: symbol): HistoryEntry[] {
  return atomHistory.get(aryId) ?? []
}

export function getAtomKey(aryId: symbol): string {
  return atomKeys.get(aryId) ?? String(aryId)
}

function hydrateFromStorage(aryId: symbol, key: string, storage: AryStorage) {
  const apply = (stored: string | null) => {
    if (stored === null) return

    try {
      setDebugValue(aryId, JSON.parse(stored), true, true)
    } catch (error) {
      console.warn(`[AryKit] No se pudo parsear el storage de "${key}":`, error)
    }
  }

  try {
    const stored = storage.getItem(key)

    if (stored instanceof Promise) {
      stored.then(apply).catch((error) => {
        console.warn(`[AryKit] No se pudo leer el storage de "${key}":`, error)
      })
      return
    }

    // Diferimos la hidratación un microtask para que el primer render use el
    // valor inicial en servidor y cliente. Así no hay mismatch de hidratación;
    // el valor persistido entra justo después.
    queueMicrotask(() => apply(stored))
  } catch (error) {
    console.warn(`[AryKit] No se pudo leer el storage de "${key}":`, error)
  }
}

export function createAry<T>(initialValue: T, options?: AryOptions): AryAtom<T> {
  const aryId = Symbol(options?.debugLabel ?? 'AryAtom') as AryAtom<T>
  atomKeys.set(aryId, `ary-${nextAtomKey++}`)

  initialValues.set(aryId, initialValue)

  const storage = options?.storage ?? globalStorage ?? getDefaultStorage()

  if (options?.persist) {
    persistenceKeys.set(aryId, options.persist)
    if (storage) atomStorage.set(aryId, storage)
  }

  if (options?.debugLabel) {
    atomLabels.set(aryId, options.debugLabel)
  }

  aryValues.set(aryId, initialValue)
  subscribers.set(aryId, new Set())

  notifyDebug()

  if (options?.persist && storage) {
    hydrateFromStorage(aryId, options.persist, storage)
  }

  return aryId
}

function internalSetAtomValue(
  aryId: symbol,
  newValue: unknown,
  skipHistory = false,
  skipPersistence = false,
) {
  aryValues.set(aryId, newValue)

  if (!skipHistory) addToHistory(aryId, newValue)

  const persistKey = persistenceKeys.get(aryId)
  const storage = atomStorage.get(aryId)

  if (!skipPersistence && persistKey && storage) {
    try {
      // No se espera: en storage asíncrono la escritura ocurre en segundo plano.
      storage.setItem(persistKey, safeStringify(newValue))
    } catch (error) {
      console.warn(
        `[AryKit] No se pudo escribir el storage de "${persistKey}":`,
        error,
      )
    }
  }

  subscribers.get(aryId)?.forEach((callback) => callback(newValue))

  notifyDebug()
}

export function subscribeToDebug(callback: DebugSubscriber) {
  debugSubscribers.add(callback)
  return () => {
    debugSubscribers.delete(callback)
  }
}

export function getDebugState() {
  const snapshot = new Map<
    symbol,
    { value: unknown; label?: string; isPersistent: boolean }
  >()

  aryValues.forEach((value, id) => {
    snapshot.set(id, {
      value,
      label: atomLabels.get(id),
      isPersistent: persistenceKeys.has(id),
    })
  })

  return snapshot
}

export function setDebugValue(
  aryId: symbol,
  newValue: unknown,
  skipHistory = false,
  skipPersistence = false,
) {
  internalSetAtomValue(aryId, newValue, skipHistory, skipPersistence)
}

export function resetAry(aryId: symbol) {
  if (!initialValues.has(aryId)) return
  setDebugValue(aryId, initialValues.get(aryId))
}

type Setter<T> = (newValue: T | ((prev: T) => T)) => void
type AryHookResult<T> = [T, Setter<T>]

export function useAryState<T>(aryId: AryAtom<T>): AryHookResult<T> {
  const value = useSyncExternalStore(
    (onStoreChange) => {
      const subs = subscribers.get(aryId)
      if (!subs) return () => {}

      subs.add(onStoreChange as Subscriber)
      return () => {
        subs.delete(onStoreChange as Subscriber)
      }
    },
    () => aryValues.get(aryId) as T,
  )

  const updateValue: Setter<T> = (newValue) => {
    const currentValue = aryValues.get(aryId) as T
    const nextValue =
      typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(currentValue)
        : newValue

    internalSetAtomValue(aryId, nextValue)
  }

  return [value, updateValue]
}
