import { describe, it, expect, vi } from 'vitest'
import { h } from 'preact'
import { createServer } from '../src/server'
import { redirect, notFound } from '../src/index'
import type { RouteEntry } from '../src/routes'
import type { RequestCtx } from '../src/types'

type Module = {
  default: () => unknown
  loader?: (ctx: RequestCtx) => Promise<unknown>
  action?: (ctx: RequestCtx & { form: FormData }) => Promise<unknown>
}

const routes: RouteEntry[] = [
  { path: '/', file: 'index.tsx', type: 'page', dir: '' },
  { path: '/listings', file: 'listings/index.tsx', type: 'page', dir: 'listings' },
  { path: '/listings/:id', file: 'listings/[id]/index.tsx', type: 'page', dir: 'listings/[id]' },
  { path: '/', file: 'layout.tsx', type: 'layout', dir: '' },
  { path: '/listings', file: 'listings/layout.tsx', type: 'layout', dir: 'listings' },
]

/** Render de prueba: vuelca lo que recibió para poder inspeccionarlo en el HTML. */
function fakeRender() {
  return vi.fn((opts: { data: unknown; params: unknown; result?: unknown }) =>
    h(
      'div',
      null,
      h('pre', { id: 'data' }, JSON.stringify(opts.data)),
      h('pre', { id: 'params' }, JSON.stringify(opts.params)),
      h('pre', { id: 'result' }, JSON.stringify(opts.result ?? null)),
    ),
  )
}

function makeApp(
  modules: Record<string, Module>,
  extra: { session?: (ctx: RequestCtx) => Promise<{ id: string; name: string } | null> } = {},
) {
  const render = fakeRender()
  const loadModule = vi.fn(async (file: string) => {
    const mod = modules[file]
    if (!mod) throw new Error(`módulo no encontrado: ${file}`)
    return mod
  })
  const app = createServer({ routes, render, loadModule, ...extra })
  return { app, render, loadModule }
}

const pages = (): Record<string, Module> => ({
  'index.tsx': {
    default: () => null,
    loader: async () => ({ mensaje: 'hola' }),
  },
  'listings/index.tsx': {
    default: () => null,
    loader: async (ctx) => ({ ciudad: ctx.query.get('city') }),
  },
  'listings/[id]/index.tsx': {
    default: () => null,
    loader: async (ctx) => ({ id: ctx.params.id }),
  },
  'layout.tsx': { default: () => null },
  'listings/layout.tsx': { default: () => null },
})

describe('GET', () => {
  it('corre el loader y renderiza el dato', async () => {
    const { app } = makeApp(pages())
    const res = await app.request('/')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('hola')
  })

  it('pasa los params al loader', async () => {
    const { app } = makeApp(pages())
    const body = await (await app.request('/listings/42')).text()

    expect(body).toContain('42')
    expect(body).toContain('"id"')
  })

  it('expone el query string', async () => {
    const { app } = makeApp(pages())
    const body = await (await app.request('/listings?city=mdp')).text()

    expect(body).toContain('mdp')
  })

  it('responde 404 si no hay page', async () => {
    const { app } = makeApp(pages())
    expect((await app.request('/nope')).status).toBe(404)
  })

  it('responde 404 si el loader llama notFound()', async () => {
    const modules = pages()
    modules['index.tsx']!.loader = async () => notFound()
    const { app } = makeApp(modules)

    expect((await app.request('/')).status).toBe(404)
  })

  it('pasa los layouts y la page al render, raíz primero', async () => {
    const { app, render } = makeApp(pages())
    await app.request('/listings/42')

    const opts = render.mock.calls[0]![0] as unknown as { layouts: RouteEntry[] }
    expect(opts.layouts.map((l) => l.dir)).toEqual(['', 'listings'])
  })
})

describe('POST', () => {
  it('ejecuta el action y renderiza con result', async () => {
    const modules = pages()
    const action = vi.fn(async (ctx: RequestCtx & { form: FormData }) => ({
      guardado: ctx.form.get('nombre'),
    }))
    modules['listings/[id]/index.tsx']!.action = action
    const { app } = makeApp(modules)

    const form = new FormData()
    form.set('nombre', 'Caro')

    const res = await app.request('/listings/42', { method: 'POST', body: form })
    const body = await res.text()

    expect(res.status).toBe(200)
    expect(action).toHaveBeenCalledTimes(1)
    expect(body).toContain('Caro')
  })

  it('redirige con 303 + Location cuando el action lanza redirect', async () => {
    const modules = pages()
    modules['listings/[id]/index.tsx']!.action = async () => redirect('/login')
    const { app } = makeApp(modules)

    const res = await app.request('/listings/42', { method: 'POST', body: new FormData() })

    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('/login')
  })

  it('responde 404 cuando el action lanza notFound', async () => {
    const modules = pages()
    modules['listings/[id]/index.tsx']!.action = async () => notFound()
    const { app } = makeApp(modules)

    const res = await app.request('/listings/42', { method: 'POST', body: new FormData() })
    expect(res.status).toBe(404)
  })

  it('carga cada módulo una sola vez por request', async () => {
    const { app, loadModule } = makeApp(pages())
    await app.request('/listings/42', { method: 'POST', body: new FormData() })

    const files = loadModule.mock.calls.map(([file]) => file)
    expect(new Set(files).size).toBe(files.length)
    expect(files).toContain('listings/[id]/index.tsx')
    expect(files).toContain('layout.tsx')
    expect(files).toContain('listings/layout.tsx')
  })
})

describe('layouts en paralelo', () => {
  it('corre los loaders de layouts y page en paralelo', async () => {
    const slow = () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 10))
    const layoutLoader = vi.fn(slow)
    const pageLoader = vi.fn(slow)

    const modules = pages()
    modules['layout.tsx']!.loader = layoutLoader
    modules['listings/layout.tsx']!.loader = layoutLoader
    modules['listings/[id]/index.tsx']!.loader = pageLoader

    const { app } = makeApp(modules)
    const start = Date.now()
    await app.request('/listings/42')

    expect(Date.now() - start).toBeLessThan(25)
    expect(layoutLoader).toHaveBeenCalledTimes(2)
    expect(pageLoader).toHaveBeenCalledTimes(1)
  })
})

describe('session', () => {
  it('pasa el user del session al loader', async () => {
    const modules = pages()
    let seen: RequestCtx['user'] = null
    modules['index.tsx']!.loader = async (ctx) => {
      seen = ctx.user
      return { nombre: ctx.user?.name }
    }

    const { app } = makeApp(modules, {
      session: async () => ({ id: '1', name: 'Caro' }),
    })
    const body = await (await app.request('/')).text()

    expect(seen).toEqual({ id: '1', name: 'Caro' })
    expect(body).toContain('Caro')
  })

  it('deja user en null sin session', async () => {
    const modules = pages()
    let seen: RequestCtx['user'] | 'sin-visitar' = 'sin-visitar'
    modules['index.tsx']!.loader = async (ctx) => {
      seen = ctx.user
      return {}
    }

    const { app } = makeApp(modules)
    await app.request('/')

    expect(seen).toBeNull()
  })
})

describe('errores', () => {
  it('responde 303 si el render lanza redirect', async () => {
    const app = createServer({
      routes,
      render: () => redirect('/otra') as never,
      loadModule: async () => ({ default: () => null }),
    })

    const res = await app.request('/')
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('/otra')
  })

  it('responde 500 con body "500" ante un error no controlado', async () => {
    const modules = pages()
    modules['index.tsx']!.loader = async () => {
      throw new Error('boom')
    }
    const { app } = makeApp(modules)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await app.request('/')
    spy.mockRestore()

    expect(res.status).toBe(500)
    expect(await res.text()).toBe('500')
  })
})
