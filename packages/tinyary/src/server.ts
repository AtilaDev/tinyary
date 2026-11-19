import { Hono, type Context } from 'hono'
import type { VNode } from 'preact'
import { matchRoute, type RouteEntry } from './routes'
import { injectData, renderSSR } from './render'
import type { Params, RequestCtx } from './types'

export type LoadedModule = {
  default: unknown
  loader?: (ctx: RequestCtx) => Promise<unknown>
  action?: (ctx: RequestCtx & { form: FormData }) => Promise<unknown>
}

export interface RenderOptions {
  page: RouteEntry
  layouts: RouteEntry[]
  data: Record<string, unknown>
  params: Params
  result?: unknown
}

export interface ServerOptions {
  routes: RouteEntry[]
  render: (opts: RenderOptions) => VNode
  loadModule: (file: string) => Promise<LoadedModule>
  session?: (ctx: RequestCtx) => Promise<{ id: string; name: string } | null>
  /**
   * Documento base con `<div id="tinyary-root">`. En el ejemplo lo aporta
   * hello (en la sesión con Vite, `index.html` crudo); sin él se usa uno mínimo.
   * DECISIÓN: el spec no incluye este campo en las opciones, pero la firma de
   * `injectData` exige un HTML base y el server no puede leer archivos.
   */
  shell?: string
}

const DEFAULT_SHELL = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="tinyary-root"></div>
  </body>
</html>`

const ROOT_ID = 'tinyary-root'

function isRedirect(error: unknown): error is Error & { to: string } {
  return error instanceof Error && error.message === 'TINYARY_REDIRECT'
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && error.message === 'TINYARY_NOT_FOUND'
}

function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>()
  if (!header) return cookies

  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    if (name) cookies.set(name, decodeURIComponent(value))
  }

  return cookies
}

/**
 * DECISIÓN: `render` devuelve sólo el árbol de la app (layouts + page); el
 * documento sale de `shell`. Así `injectData` puede inyectar el HTML renderizado
 * dentro del root sin que el server conozca Preact ni el filesystem.
 */
export function createServer(options: ServerOptions): Hono {
  const { routes, render, loadModule, session, shell = DEFAULT_SHELL } = options
  const app = new Hono()

  const handle = async (c: Context, method: 'GET' | 'POST') => {
    const url = new URL(c.req.url)
    const match = matchRoute(routes, url.pathname)

    if (!match) return c.text('404', 404)

    try {
      const ctx: RequestCtx = {
        request: c.req.raw,
        url,
        params: match.params,
        query: url.searchParams,
        cookies: parseCookies(c.req.header('cookie')),
        user: null,
      }

      if (session) ctx.user = await session(ctx)

      // El módulo de la page se carga antes que el action para no cargarlo dos veces.
      const pageModule = await loadModule(match.page.file)

      let result: unknown
      if (method === 'POST' && pageModule.action) {
        const form = await c.req.formData()
        result = await pageModule.action({ ...ctx, form })
      }

      const layoutModules = await Promise.all(match.layouts.map((l) => loadModule(l.file)))

      const [pageData, ...layoutData] = await Promise.all([
        pageModule.loader ? pageModule.loader(ctx) : Promise.resolve(null),
        ...layoutModules.map((m) => (m.loader ? m.loader(ctx) : Promise.resolve(null))),
      ])

      // DECISIÓN: sólo los layouts con loader aportan datos, keyed por archivo,
      // para que un layout sin loader no ensucie el payload de hidratación.
      const data: Record<string, unknown> = { page: pageData ?? null }
      match.layouts.forEach((layout, i) => {
        const value = layoutData[i]
        if (value !== null && value !== undefined) data[layout.file] = value
      })

      const tree = render({
        page: match.page,
        layouts: match.layouts,
        data,
        params: match.params,
        ...(result === undefined ? {} : { result }),
      })

      const appHtml = renderSSR(tree)
      const html = injectData(shell, { html: appHtml, data, params: match.params, result }, ROOT_ID)

      return c.html(html)
    } catch (error) {
      if (isRedirect(error)) return c.redirect(error.to, 303)
      if (isNotFound(error)) return c.text('404', 404)

      // DECISIÓN: sin logger configurable en esta etapa; el error no se filtra al body.
      console.error('[tinyary] error no controlado:', error)
      return c.text('500', 500)
    }
  }

  app.get('*', (c) => handle(c, 'GET'))
  app.post('*', (c) => handle(c, 'POST'))

  return app
}

// Utilidades server-only. No salen desde la raíz para no arrastrar node:fs ni
// preact-render-to-string al navegador.
export { createCache } from './cache'
export { scanRoutes, matchPattern, matchRoute } from './routes'
export { renderSSR, serializeData, injectData } from './render'
