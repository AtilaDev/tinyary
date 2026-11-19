import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { scanRoutes, matchPattern, matchRoute, type RouteEntry } from '../src/routes'

const routesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/routes')

describe('scanRoutes', () => {
  const routes = scanRoutes(routesDir)
  const pages = routes.filter((r) => r.type === 'page')
  const layouts = routes.filter((r) => r.type === 'layout')

  it('encuentra las 3 pages del fixture', () => {
    expect(pages).toHaveLength(3)
  })

  it('encuentra los 2 layouts del fixture', () => {
    expect(layouts).toHaveLength(2)
  })

  it('asigna el pattern raíz a index.tsx', () => {
    expect(pages.find((p) => p.file === 'index.tsx')).toMatchObject({
      path: '/',
      dir: '',
      type: 'page',
    })
  })

  it('asigna /listings a listings/index.tsx', () => {
    expect(pages.find((p) => p.file === 'listings/index.tsx')).toMatchObject({
      path: '/listings',
      dir: 'listings',
    })
  })

  it('convierte carpetas dinámicas en params', () => {
    expect(pages.find((p) => p.file === 'listings/[id]/index.tsx')).toMatchObject({
      path: '/listings/:id',
      dir: 'listings/[id]',
    })
  })

  it('ignora nope.tsx porque solo index.tsx es ruteable', () => {
    expect(pages.find((p) => p.file === 'nope.tsx')).toBeUndefined()
  })

  it('no inventa pages para archivos que no son index.tsx', () => {
    expect(pages.map((p) => p.path).sort()).toEqual([
      '/',
      '/listings',
      '/listings/:id',
    ])
  })
})

describe('matchPattern', () => {
  it('matchea la raíz', () => {
    expect(matchPattern('/', '/')).toEqual({})
  })

  it('matchea un path estático', () => {
    expect(matchPattern('/listings', '/listings')).toEqual({})
  })

  it('extrae un param dinámico', () => {
    expect(matchPattern('/listings/:id', '/listings/42')).toEqual({ id: '42' })
  })

  it('devuelve null si falta el segmento del param', () => {
    expect(matchPattern('/listings/:id', '/listings')).toBeNull()
  })

  it('devuelve null si sobran segmentos', () => {
    expect(matchPattern('/listings/:id', '/listings/42/x')).toBeNull()
  })

  it('devuelve null si un segmento estático no coincide', () => {
    expect(matchPattern('/listings', '/otra')).toBeNull()
  })

  it('ignora barras finales', () => {
    expect(matchPattern('/listings', '/listings/')).toEqual({})
  })
})

describe('matchRoute', () => {
  const routes: RouteEntry[] = scanRoutes(routesDir)

  it('devuelve la page y los layouts raíz primero, hoja al final', () => {
    const match = matchRoute(routes, '/listings/42')
    expect(match).not.toBeNull()
    expect(match!.page.path).toBe('/listings/:id')
    expect(match!.params).toEqual({ id: '42' })
    expect(match!.layouts.map((l) => l.dir)).toEqual(['', 'listings'])
  })

  it('devuelve null cuando no hay page para el path', () => {
    expect(matchRoute(routes, '/no-existe')).toBeNull()
  })

  it('no matchea /nope porque nope.tsx no es index.tsx', () => {
    expect(matchRoute(routes, '/nope')).toBeNull()
  })

  it('aplica solo el layout raíz a /listings', () => {
    const match = matchRoute(routes, '/listings')
    expect(match).not.toBeNull()
    expect(match!.layouts.map((l) => l.dir)).toEqual([''])
  })

  it('aplica solo el layout raíz a /', () => {
    const match = matchRoute(routes, '/')
    expect(match).not.toBeNull()
    expect(match!.layouts.map((l) => l.dir)).toEqual([''])
  })
})
