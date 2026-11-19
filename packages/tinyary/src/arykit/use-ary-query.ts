import { useEffect, useRef, useState } from 'preact/hooks'

interface CacheEntry<TData = unknown> {
  data: TData
  timestamp: number
}

// Caché global de queries.
const cache = new Map<string, CacheEntry>()

// Suscriptores por query para invalidaciones y refetch.
const listeners = new Map<string, Set<() => void>>()

export interface UseAryQueryOptions {
  enabled?: boolean
  staleTime?: number
  cacheTime?: number
}

export interface UseAryQueryResult<TData, TError> {
  data: TData | null
  isLoading: boolean
  error: TError | null
  refetch: () => void
}

export function useAryQuery<TData = unknown, TError = unknown>(
  queryKey: string,
  queryFn: () => Promise<TData>,
  options: UseAryQueryOptions = {},
): UseAryQueryResult<TData, TError> {
  const { enabled = true, staleTime = 0, cacheTime = 5 * 60 * 1000 } = options

  // Mantener la última queryFn sin volver a disparar el efecto en cada render.
  const queryFnRef = useRef(queryFn)
  queryFnRef.current = queryFn

  const [data, setData] = useState<TData | null>(() => {
    const cached = cache.get(queryKey)
    return cached ? (cached.data as TData) : null
  })

  const [isLoading, setIsLoading] = useState<boolean>(() => !cache.has(queryKey))
  const [error, setError] = useState<TError | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    if (!listeners.has(queryKey)) listeners.set(queryKey, new Set())

    const triggerRefetch = () => setRefetchTrigger((prev) => prev + 1)
    const queryListeners = listeners.get(queryKey)
    queryListeners?.add(triggerRefetch)

    return () => {
      queryListeners?.delete(triggerRefetch)

      // Si no quedan consumidores, liberar la entrada después de cacheTime.
      if (cacheTime > 0 && (!queryListeners || queryListeners.size === 0)) {
        setTimeout(() => {
          const latestListeners = listeners.get(queryKey)
          if (!latestListeners || latestListeners.size === 0) {
            cache.delete(queryKey)
          }
        }, cacheTime)
      }
    }
  }, [queryKey, cacheTime])

  useEffect(() => {
    if (!enabled) return

    const cached = cache.get(queryKey)
    const now = Date.now()

    // Datos frescos: no hace falta ir a la red.
    if (cached && now - cached.timestamp < staleTime && refetchTrigger === 0) {
      setData(cached.data as TData)
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await queryFnRef.current()
        if (cancelled) return

        cache.set(queryKey, { data: result, timestamp: Date.now() })
        setData(result)
        setError(null)
      } catch (caught) {
        if (cancelled) return

        setError(caught as TError)
        setData(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [queryKey, enabled, staleTime, refetchTrigger])

  const refetch = () => setRefetchTrigger((prev) => prev + 1)

  return { data, isLoading, error, refetch }
}

/** Invalida una o varias queries y fuerza un refetch de sus consumidores. */
export function invalidateQueries(queryKeys: string | string[]): void {
  const keys = Array.isArray(queryKeys) ? queryKeys : [queryKeys]

  keys.forEach((key) => {
    cache.delete(key)
    listeners.get(key)?.forEach((listener) => listener())
  })
}

/** Limpia todo el caché y avisa a los consumidores. */
export function clearCache(): void {
  cache.clear()
  listeners.forEach((listenerSet) => {
    listenerSet.forEach((listener) => listener())
  })
}

export interface UseMutationOptions<TData, TError, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: TError, variables: TVariables) => void
  onSettled?: (
    data: TData | null,
    error: TError | null,
    variables: TVariables,
  ) => void
}

export interface UseMutationResult<TData, TError, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>
  data: TData | null
  error: TError | null
  isLoading: boolean
  reset: () => void
}

export function useAryMutation<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TError, TVariables> = {},
): UseMutationResult<TData, TError, TVariables> {
  const { onSuccess, onError, onSettled } = options

  const [data, setData] = useState<TData | null>(null)
  const [error, setError] = useState<TError | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const mutate = async (variables: TVariables): Promise<TData> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await mutationFn(variables)
      setData(result)
      onSuccess?.(result, variables)
      onSettled?.(result, null, variables)
      return result
    } catch (caught) {
      const mutationError = caught as TError
      setError(mutationError)
      onError?.(mutationError, variables)
      onSettled?.(null, mutationError, variables)
      throw caught
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setData(null)
    setError(null)
    setIsLoading(false)
  }

  return { mutate, data, error, isLoading, reset }
}
