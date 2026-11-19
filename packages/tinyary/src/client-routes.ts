import type { Params } from './types'

// DECISIÓN: copia browser-safe del helper puro. tinyary/routes importa node:fs
// para scanRoutes; separarlo del núcleo permitiría reutilizarlo, pero el núcleo
// de rutas está fuera de alcance en esta etapa. El plugin sólo la usa en cliente.
export function matchPattern(pattern: string, pathname: string): Params | null {
  const patternSegments = pattern.split('/').filter(Boolean)
  const pathSegments = pathname.split('/').filter(Boolean)

  if (patternSegments.length !== pathSegments.length) return null

  const params: Params = {}

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i] as string
    const pathSegment = pathSegments[i] as string

    if (patternSegment.startsWith(':')) {
      if (pathSegment === '') return null
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment)
    } else if (patternSegment !== pathSegment) {
      return null
    }
  }

  return params
}
