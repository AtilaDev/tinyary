import { describe, it, expect } from 'vitest'
import {
  generateClientEntry,
  generateServerEntry,
} from '../src/virtual-entries'
import type { RouteEntry } from '../src/routes'

const rutaSimple: RouteEntry = {
  path: '/',
  file: 'index.tsx',
  type: 'page',
  dir: '',
}

const rutas: RouteEntry[] = [
  rutaSimple,
  {
    path: '/listings/:id',
    file: '/proyecto/routes/listings/[id]/index.tsx',
    type: 'page',
    dir: 'listings/[id]',
  },
  { path: '/', file: '/proyecto/routes/layout.tsx', type: 'layout', dir: '' },
]

describe('generateServerEntry', () => {
  it('incluye el glob absoluto de módulos de rutas', () => {
    expect(generateServerEntry([rutaSimple])).toContain(
      `import.meta.glob('/routes/**/*.{ts,tsx}')`,
    )
  })

  it('importa los virtual modules de routes y components', () => {
    const server = generateServerEntry(rutas)

    expect(server).toContain("from 'virtual:tinyary/routes'")
    expect(server).toContain("from 'virtual:tinyary/components'")
  })

  it('arma el app y expone el arranque con serve', () => {
    const server = generateServerEntry(rutas)

    expect(server).toContain('createServer({')
    expect(server).toContain('serve({')
  })

  it('embebe exactamente el JSON del manifest de input', () => {
    expect(generateServerEntry(rutas)).toContain(
      `const manifest = ${JSON.stringify(rutas)}`,
    )
  })

  it('normaliza files absolutos y relativos a keys del glob', () => {
    const server = generateServerEntry(rutas)

    expect(server).toContain("normalized.lastIndexOf('/routes/')")
    expect(server).toContain("? `/routes/${normalized.replace(/^\\.?\\//, '')}`")
    expect(server).toContain('normalized.slice(marker)')
  })
})

describe('generateClientEntry', () => {
  it('usa matchPattern para identificar la página actual', () => {
    const client = generateClientEntry(rutas)

    expect(client).toContain("import { matchPattern } from 'tinyary/routes'")
    expect(client).toContain('matchPattern(route.path, pathname)')
  })

  it('usa bootstrap y los componentes cargados por el virtual module', () => {
    const client = generateClientEntry(rutas)

    expect(client).toContain("import { bootstrap } from 'tinyary/client'")
    expect(client).toContain("from 'virtual:tinyary/components'")
    expect(client).toContain('bootstrap({')
  })

  it('aplica layouts con la misma regla de descendientes que matchRoute', () => {
    const client = generateClientEntry(rutas)

    expect(client).toContain("route.dir === ''")
    expect(client).toContain('page.dir.startsWith(`${route.dir}/`)')
  })
})
