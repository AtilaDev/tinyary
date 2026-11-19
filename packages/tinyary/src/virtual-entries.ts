import type { RouteEntry } from './routes'

const MODULE_KEY_HELPER = `const moduleKey = (file) => {
  const normalized = file.replace(/\\\\/g, '/')
  const marker = normalized.lastIndexOf('/routes/')

  return marker === -1
    ? \`/routes/\${normalized.replace(/^\\.?\\//, '')}\`
    : normalized.slice(marker)
}`

/** Módulo SSR generado por el plugin; no se ejecuta fuera del pipeline de Vite. */
export function generateServerEntry(routes: RouteEntry[]): string {
  return `/* generado por tinyary — no editar */
import { serve } from '@hono/node-server'
import { h } from 'preact'
import { createServer } from 'tinyary/server'
import { routes } from 'virtual:tinyary/routes'
import { components } from 'virtual:tinyary/components'
import { session } from '/tinyary.config.ts'
import indexHtml from '/index.html?raw'

// Manifest del escaneo: file puede ser relativo o absoluto según scanRoutes.
const manifest = ${JSON.stringify(routes)}
const mods = import.meta.glob('/routes/**/*.{ts,tsx}')

${MODULE_KEY_HELPER}

const loadModule = (file) => {
  const key = moduleKey(file)
  const load = mods[key]

  if (!load) throw new Error(\`tinyary: sin módulo para \${key}\`)
  return load()
}

const componentFor = (file) => {
  const entry = manifest.find((route) => route.file === file)
  if (!entry) throw new Error(\`tinyary: archivo fuera del manifest: \${file}\`)

  const key = moduleKey(entry.file)
  const mod = components[key]

  if (!mod?.default) throw new Error(\`tinyary: sin default export en \${key}\`)
  return mod.default
}

const render = ({ page, layouts, data, params, result }) => {
  const tree = h(componentFor(page.file), {
    data: data.page,
    params,
    result,
  })

  return layouts.reduceRight(
    (child, layout) => h(componentFor(layout.file), null, child),
    tree,
  )
}

// El SSR no pasa por transformIndexHtml: agregar el script acá, sin duplicarlo.
const clientScript =
  '<script type="module" src="/@id/virtual:tinyary/client-entry"></script>'

const shell = indexHtml.includes('virtual:tinyary/client-entry')
  ? indexHtml
  : indexHtml.replace('</body>', \`\${clientScript}</body>\`)

export const app = createServer({
  routes,
  render,
  loadModule,
  session,
  shell,
})

// DECISIÓN: Vite levanta el puerto en dev. El arranque Hono independiente queda
// explícito para no abrir un segundo listener al cargarse vía ssrLoadModule.
export const start = () => {
  const port = Number(process.env.PORT ?? 3000)

  return serve({ fetch: app.fetch, port }, () => {
    console.log(\`tinyary en http://localhost:\${port}\`)
  })
}

if (process.env.TINYARY_STANDALONE === '1') start()
`
}

/** Módulo del navegador; hidrata la página que coincide con location.pathname. */
export function generateClientEntry(routes: RouteEntry[]): string {
  return `/* generado por tinyary — no editar */
import { h } from 'preact'
import { bootstrap } from 'tinyary/client'
import { matchPattern } from 'tinyary'
import { routes } from 'virtual:tinyary/routes'
import { components } from 'virtual:tinyary/components'

${MODULE_KEY_HELPER}

const componentFor = (file) => {
  const key = moduleKey(file)
  const mod = components[key]

  if (!mod?.default) throw new Error(\`tinyary: sin default export en \${key}\`)
  return mod.default
}

const manifest = ${JSON.stringify(routes)}
const pathname = window.location.pathname

const page = manifest.find(
  (route) => route.type === 'page' && matchPattern(route.path, pathname),
)

const root = document.getElementById('tinyary-root')

if (page && root) {
  // Misma regla que matchRoute: raíz siempre; demás layouts, descendientes.
  const layouts = manifest
    .filter(
      (route) =>
        route.type === 'layout' &&
        (route.dir === '' || page.dir.startsWith(\`\${route.dir}/\`)),
    )
    .sort((a, b) => a.dir.length - b.dir.length || a.dir.localeCompare(b.dir))

  bootstrap({
    root,
    render: (data, params) => {
      const tree = h(componentFor(page.file), { data: data.page, params })

      return layouts.reduceRight(
        (child, layout) => h(componentFor(layout.file), null, child),
        tree,
      )
    },
  })
}
`
}
