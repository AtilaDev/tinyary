import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { h, type ComponentType, type VNode } from 'preact'
import type { LoadedModule, RenderOptions } from 'tinyary/server'
import { createServer } from 'tinyary/server'
import { scanRoutes } from 'tinyary/routes'
import { session } from './tinyary.config'
import Home from './routes/index'
import Layout from './routes/layout'

const routesDir = fileURLToPath(new URL('./routes', import.meta.url))
const cssFile = fileURLToPath(new URL('./styles/global.css', import.meta.url))

const routes = scanRoutes(routesDir)

const components: Record<string, ComponentType<any>> = {
  'layout.tsx': Layout,
  'index.tsx': Home,
}

// DECISIÓN: mapa en vez de switch, para que el plugin de Vite lo reemplace por
// el virtual module sin tocar el resto del archivo.
const modules: Record<string, () => Promise<LoadedModule>> = {
  'layout.tsx': () => import('./routes/layout'),
  'index.tsx': () => import('./routes/index'),
}

const loadModule = (file: string): Promise<LoadedModule> => {
  const load = modules[file]
  if (!load) throw new Error(`hello: no hay módulo para ${file}`)
  return load()
}

const shell = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TinyAry · hello</title>
    <link rel="stylesheet" href="/styles/global.css" />
  </head>
  <body>
    <div id="tinyary-root"></div>
  </body>
</html>`

const render = ({ page, layouts, data, params, result }: RenderOptions) => {
  const Page = components[page.file]
  if (!Page) throw new Error(`hello: no hay componente para ${page.file}`)

  const tree = h(Page, { data: data.page, params, result })

  return layouts.reduceRight<VNode>((child, layout) => {
    const LayoutComponent = components[layout.file]
    if (!LayoutComponent) throw new Error(`hello: no hay componente para ${layout.file}`)
    return h(LayoutComponent, null, child)
  }, tree)
}

const tinyary = createServer({ routes, render, loadModule, session, shell })

const app = new Hono()

app.get('/styles/global.css', async (c) => {
  const css = await readFile(cssFile, 'utf8')
  return c.body(css, 200, { 'Content-Type': 'text/css; charset=utf-8' })
})

app.route('/', tinyary)

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port }, () => {
  console.log(`hello en http://localhost:${port}`)
})
