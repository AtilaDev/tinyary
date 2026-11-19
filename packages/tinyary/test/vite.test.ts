import { describe, it, expect } from 'vitest'
import {
  generateClientEntry,
  generateServerEntry,
} from '../src/virtual-entries'
import type { RouteEntry } from '../src/routes'
import { tinyary } from '../src/vite'

function transformHtml(plugin: ReturnType<typeof tinyary>, html: string): string {
  const hook = plugin.transformIndexHtml as unknown as ((html: string) => string) | undefined
  if (!hook) throw new Error('transformIndexHtml debe ser función')
  return hook(html)
}

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

    expect(client).toContain("import { matchPattern } from 'tinyary'")
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

describe('plugin tinyary', () => {
  it('transformIndexHtml agrega el client-entry antes de </body>', () => {
    const html = '<html><body><div id="tinyary-root"></div></body></html>'
    const transformed = transformHtml(tinyary(), html)

    expect(transformed).toContain(
      '<script type="module" src="/@id/virtual:tinyary/client-entry"></script></body>',
    )
  })

  it('transformIndexHtml no duplica el client-entry', () => {
    const html = '<html><body><script src="virtual:tinyary/client-entry"></script></body></html>'
    const transformed = transformHtml(tinyary(), html)

    expect(transformed).toBe(html)
    expect(transformed.match(/virtual:tinyary\/client-entry/g)).toHaveLength(1)
  })

  it('carga el manifest escaneado con el mismo JSON', () => {
    const plugin = tinyary()
    const configResolved = plugin.configResolved as unknown as (config: {
      root: string
    }) => void
    const buildStart = plugin.buildStart as unknown as () => void
    const load = plugin.load as unknown as (id: string) => string

    configResolved({ root: new URL('./fixtures', import.meta.url).pathname })
    buildStart()

    const virtualRoutes = load('virtual:tinyary/routes')
    const virtualComponents = load('virtual:tinyary/components')

    expect(virtualRoutes).toContain('"file":"index.tsx"')
    expect(virtualRoutes).toContain('"path":"/listings/:id"')
    expect(virtualComponents).toContain('await Promise.all(')
    expect(virtualComponents).toContain('Object.entries(modules)')
  })

  it('resuelve los virtual ids sin prefijo nulo', () => {
    const plugin = tinyary()
    const resolveId = plugin.resolveId as unknown as (id: string) => string

    const resolved = resolveId('virtual:tinyary/client-entry')
    expect(resolved).toBe('virtual:tinyary/client-entry')
  })
})
