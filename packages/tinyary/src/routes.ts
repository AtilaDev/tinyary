import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Params } from './types'

export interface RouteEntry {
  /** Pattern de la ruta, con params en formato `:nombre` (ej. `/listings/:id`). */
  path: string
  /** Ruta del archivo relativa a `routesDir`, con separadores POSIX. */
  file: string
  type: 'page' | 'layout'
  /** Carpeta relativa a `routesDir` (ej. `listings/[id]`); `""` para la raíz. */
  dir: string
}

const PAGE_FILE = 'index.tsx'
const LAYOUT_FILE = 'layout.tsx'

/** `listings/[id]` -> `/listings/:id`; `""` -> `/`. */
function dirToPath(dir: string): string {
  if (dir === '') return '/'
  const segments = dir.split('/').map((segment) =>
    segment.startsWith('[') && segment.endsWith(']') ? `:${segment.slice(1, -1)}` : segment,
  )
  return `/${segments.join('/')}`
}

/**
 * Escanea el árbol de rutas.
 * DECISIÓN: `file` se devuelve relativo a `routesDir` y no absoluto: los
 * virtual modules lo prefijan con `/routes/` para coincidir con las keys de
 * `import.meta.glob`, y así el manifest es serializable sin depender de la ruta
 * del proyecto en disco.
 */
export function scanRoutes(routesDir: string): RouteEntry[] {
  const entries: RouteEntry[] = []

  const walk = (absDir: string, dir: string): void => {
    for (const name of readdirSync(absDir).sort()) {
      const abs = join(absDir, name)
      const childDir = dir === '' ? name : `${dir}/${name}`

      if (statSync(abs).isDirectory()) {
        walk(abs, childDir)
        continue
      }

      if (name === PAGE_FILE) {
        entries.push({ path: dirToPath(dir), file: childDir, type: 'page', dir })
      } else if (name === LAYOUT_FILE) {
        entries.push({ path: dirToPath(dir), file: childDir, type: 'layout', dir })
      }
    }
  }

  walk(routesDir, '')

  return entries.sort((a, b) => a.path.localeCompare(b.path) || a.type.localeCompare(b.type))
}

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

// DECISIÓN: un layout cubre sólo a los descendientes de su carpeta, no a la
// página index de esa misma carpeta (spec: `/listings` usa el layout raíz, no
// `listings/layout.tsx`).
function isAncestorDir(ancestor: string, dir: string): boolean {
  return ancestor === '' || dir.startsWith(`${ancestor}/`)
}

export function matchRoute(
  routes: RouteEntry[],
  pathname: string,
): { page: RouteEntry; layouts: RouteEntry[]; params: Params } | null {
  const page = routes.find((r) => r.type === 'page' && matchPattern(r.path, pathname) !== null)
  if (!page) return null

  const params = matchPattern(page.path, pathname) as Params

  // Raíz primero, hoja al final: el layout más externo envuelve a los internos.
  const layouts = routes
    .filter((r) => r.type === 'layout' && isAncestorDir(r.dir, page.dir))
    .sort((a, b) => a.dir.length - b.dir.length || a.dir.localeCompare(b.dir))

  return { page, layouts, params }
}
