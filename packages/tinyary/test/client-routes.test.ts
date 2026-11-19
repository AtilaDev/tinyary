import { describe, it, expect } from 'vitest'
import {
  matchRouteClient,
  parseDataScript,
  parseTitle,
  shouldInterceptLink,
} from '../src/client-routes'

describe('matchRouteClient', () => {
  const manifest = [
    { path: '/', file: 'index.tsx', type: 'page' as const, dir: '' },
    { path: '/items/:id', file: 'items/[id]/index.tsx', type: 'page' as const, dir: 'items/[id]' },
    { path: '/', file: 'layout.tsx', type: 'layout' as const, dir: '' },
    { path: '/items', file: 'items/layout.tsx', type: 'layout' as const, dir: 'items' },
  ]

  it('matchea la raíz', () => {
    const m = matchRouteClient(manifest, '/')
    expect(m?.page.file).toBe('index.tsx')
    expect(m?.layouts.map((l) => l.file)).toEqual(['layout.tsx'])
  })

  it('matchea ruta dinámica y aplica layout descendiente', () => {
    const m = matchRouteClient(manifest, '/items/42')
    expect(m?.page.file).toBe('items/[id]/index.tsx')
    expect(m?.params).toEqual({ id: '42' })
    expect(m?.layouts.map((l) => l.file)).toEqual(['layout.tsx', 'items/layout.tsx'])
  })

  it('devuelve null si no hay página', () => {
    expect(matchRouteClient(manifest, '/nope')).toBeNull()
  })
})

describe('parseDataScript', () => {
  it('extrae data, params y result', () => {
    const html = '<div id="tinyary-root"></div><script id="__tinyary_data__" type="application/json">{"data":{"page":{"mensaje":"Hola"}},"params":{"id":"42"},"result":{"ok":true}}</script>'
    expect(parseDataScript(html)).toEqual({
      data: { page: { mensaje: 'Hola' } },
      params: { id: '42' },
      result: { ok: true },
    })
  })

  it('devuelve null si no hay script', () => {
    expect(parseDataScript('<div></div>')).toBeNull()
  })

  it('devuelve null si el JSON es inválido', () => {
    const html = '<script id="__tinyary_data__" type="application/json">{nope}</script>'
    expect(parseDataScript(html)).toBeNull()
  })

  it('usa defaults si faltan campos', () => {
    const html = '<script id="__tinyary_data__" type="application/json">{}</script>'
    expect(parseDataScript(html)).toEqual({ data: {}, params: {}, result: null })
  })
})

describe('parseTitle', () => {
  it('extrae el título', () => {
    expect(parseTitle('<head><title>Mi página</title></head>')).toBe('Mi página')
  })
  it('devuelve null si no hay título', () => {
    expect(parseTitle('<head></head>')).toBeNull()
  })
})

describe('shouldInterceptLink', () => {
  function anchor(attrs: Record<string, string> = {}, href = '/about'): HTMLAnchorElement {
    const attributes: Record<string, string> = { ...attrs }
    const a = {
      href,
      target: attrs.target ?? '',
      hasAttribute: (k: string) => k in attributes,
      getAttribute: (k: string) => (k in attributes ? attributes[k] : null),
    } as unknown as HTMLAnchorElement
    return a
  }

  it('intercepta un link interno simple', () => {
    expect(shouldInterceptLink(anchor({}, '/about'), 'http://localhost:3000')).toBe(true)
  })

  it('no intercepta links externos', () => {
    expect(shouldInterceptLink(anchor({}, 'https://example.com/x'), 'http://localhost:3000')).toBe(false)
  })

  it('no intercepta con target _blank', () => {
    const a = anchor({ target: '_blank' }, '/about')
    expect(shouldInterceptLink(a, 'http://localhost:3000')).toBe(false)
  })

  it('no intercepta con download', () => {
    const a = anchor({ download: '' }, '/file.pdf')
    expect(shouldInterceptLink(a, 'http://localhost:3000')).toBe(false)
  })

  it('no intercepta hash-only en la misma página', () => {
    const orig = (globalThis as any).location
    ;(globalThis as any).location = { pathname: '/about', search: '' }
    const a = anchor({}, '/about#seccion')
    const res = shouldInterceptLink(a, 'http://localhost:3000')
    ;(globalThis as any).location = orig
    expect(res).toBe(false)
  })
})
