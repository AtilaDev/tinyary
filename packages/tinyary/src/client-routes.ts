import type { Params } from './types'

// Copia browser-safe del helper puro. routes.ts importa node:fs para
// scanRoutes, así que la raíz de tinyary reexporta sólo esto al navegador.
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
