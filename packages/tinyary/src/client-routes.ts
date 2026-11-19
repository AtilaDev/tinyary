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

// Tipo liviano de ruta para el navegador (mirror de RouteEntry, sin node:fs).
export interface ClientRouteEntry {
  path: string
  file: string
  type: 'page' | 'layout'
  dir: string
}

export interface MatchedClientRoute {
  page: ClientRouteEntry
  layouts: ClientRouteEntry[]
  params: Params
}

// Misma regla que matchRoute del servidor: raíz siempre; los demás layouts,
// sólo descendientes de su carpeta.
export function matchRouteClient(
  manifest: ClientRouteEntry[],
  pathname: string,
): MatchedClientRoute | null {
  const page = manifest.find(
    (route) => route.type === 'page' && matchPattern(route.path, pathname) !== null,
  )
  if (!page) return null

  const params = matchPattern(page.path, pathname) as Params

  const layouts = manifest
    .filter(
      (route) =>
        route.type === 'layout' && (route.dir === '' || page.dir.startsWith(`${route.dir}/`)),
    )
    .sort((a, b) => a.dir.length - b.dir.length || a.dir.localeCompare(b.dir))

  return { page, layouts, params }
}

// Extrae el payload de hidratación inyectado por injectData en el HTML.
export function parseDataScript(html: string): { data: Record<string, unknown>; params: Params; result: unknown } | null {
  const match = html.match(/<script id="__tinyary_data__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!match) return null

  try {
    const parsed = JSON.parse(match[1]) as {
      data?: Record<string, unknown>
      params?: Params
      result?: unknown
    }
    return {
      data: parsed.data ?? {},
      params: parsed.params ?? {},
      result: parsed.result ?? null,
    }
  } catch {
    return null
  }
}

// Extrae el <title> del HTML (para actualizar document.title al navegar).
export function parseTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? match[1].trim() : null
}

// ¿Es un link que conviene interceptar para navegación client-side?
export function shouldInterceptLink(anchor: HTMLAnchorElement, currentOrigin: string): boolean {
  if (anchor.target && anchor.target !== '_self') return false
  if (anchor.hasAttribute('download')) return false
  if (anchor.getAttribute('rel') === 'external') return false

  let url: URL
  try {
    url = new URL(anchor.href, currentOrigin)
  } catch {
    return false
  }

  if (url.origin !== currentOrigin) return false

  const currentLocation = (globalThis as { location?: { pathname?: string; search?: string } }).location
  const currentPath = currentLocation?.pathname ?? ''
  const currentSearch = currentLocation?.search ?? ''
  if (url.pathname === currentPath && url.search === currentSearch && url.hash) return false

  return true
}
