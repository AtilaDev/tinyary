import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { scanRoutes, type RouteEntry } from './routes.ts'
import { generateClientEntry, generateServerEntry } from './virtual-entries.ts'

export const VIRTUAL_IDS = {
  routes: 'virtual:tinyary/routes',
  components: 'virtual:tinyary/components',
  serverEntry: 'virtual:tinyary/server-entry',
  clientEntry: 'virtual:tinyary/client-entry',
} as const

const CLIENT_ENTRY_SCRIPT =
  '<script type="module" src="/@id/virtual:tinyary/client-entry"></script>'

function generateComponents(): string {
  return `/* generado por tinyary — no editar */
const modules = import.meta.glob('/routes/**/*.{ts,tsx}')

// DECISIÓN: top-level await deja components cargado y permite que el resto del
// server-entry sea síncrono. Se preservan las keys del glob para resolve file.
const mods = await Promise.all(
  Object.entries(modules).map(async ([file, load]) => [file, await load()]),
)

export const components = Object.fromEntries(mods)
`
}

function generateRoutes(routes: RouteEntry[]): string {
  return `export const routes = ${JSON.stringify(routes)}
`
}

async function handleSsrRequest(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const host = req.headers.host ?? 'localhost'
  const method = req.method ?? 'GET'
  const headers = new Headers()

  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item)
    } else if (value !== undefined) {
      headers.set(name, value)
    }
  }

  const init: RequestInit & { duplex?: 'half' } = { method, headers }
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = req as unknown as BodyInit
    init.duplex = 'half'
  }

  const { app } = (await server.ssrLoadModule('/server.ts')) as {
    app: { fetch: (request: Request) => Promise<Response> }
  }

  const response = await app.fetch(new Request(`http://${host}${req.url ?? '/'}`, init))
  const body = Buffer.from(await response.arrayBuffer())

  res.statusCode = response.status
  response.headers.forEach((value, name) => res.setHeader(name, value))
  res.end(body)
}

export function tinyary(): Plugin {
  let routesDir = join(process.cwd(), 'routes')
  let manifest: RouteEntry[] = []

  const scan = (): void => {
    manifest = existsSync(routesDir) ? scanRoutes(routesDir) : []
  }

  return {
    name: 'tinyary',

    configResolved(config) {
      routesDir = join(config.root, 'routes')
    },

    buildStart() {
      scan()
    },

    configureServer(server) {
      const invalidateVirtualModules = (): void => {
        scan()

        for (const id of Object.values(VIRTUAL_IDS)) {
          const module = server.moduleGraph.getModuleById(id)
          if (module) server.moduleGraph.invalidateModule(module)
        }

        server.ws.send({ type: 'full-reload', path: '*' })
      }

      server.watcher.add(routesDir)
      server.watcher.on('add', invalidateVirtualModules)
      server.watcher.on('unlink', invalidateVirtualModules)

      // Post hook: los assets de Vite se sirven antes y este middleware sólo
      // recibe los requests sin respuesta previa, que corresponden a SSR.
      return () => {
        server.middlewares.use((req, res, next) => {
          handleSsrRequest(server, req, res).catch((error: unknown) => {
            if (error instanceof Error) server.ssrFixStacktrace(error)
            next(error)
          })
        })
      }
    },

    resolveId(id) {
      if (Object.values(VIRTUAL_IDS).includes(id as (typeof VIRTUAL_IDS)[keyof typeof VIRTUAL_IDS])) {
        return id
      }
      return null
    },

    load(id) {
      if (id === VIRTUAL_IDS.routes) return generateRoutes(manifest)
      if (id === VIRTUAL_IDS.components) return generateComponents()
      if (id === VIRTUAL_IDS.serverEntry) return generateServerEntry(manifest)
      if (id === VIRTUAL_IDS.clientEntry) return generateClientEntry(manifest)
      return null
    },

    transformIndexHtml(html) {
      if (html.includes('virtual:tinyary/client-entry')) return html

      return html.includes('</body>')
        ? html.replace('</body>', `${CLIENT_ENTRY_SCRIPT}</body>`)
        : `${html}${CLIENT_ENTRY_SCRIPT}`
    },
  }
}
