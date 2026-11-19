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

export const start = () => {
  const port = Number(process.env.PORT ?? 3000)
  return serve({ fetch: app.fetch, port }, () => {
    console.log(\`tinyary en http://localhost:\${port}\`)
  })
}

if (process.env.TINYARY_STANDALONE === '1') start()
`
}

/** Módulo del navegador; hidrata la página inicial y habilita navegación client-side. */
export function generateClientEntry(routes: RouteEntry[]): string {
  return `/* generado por tinyary — no editar */
import { h } from 'preact'
import { render } from 'preact'
import { bootstrap } from 'tinyary/client'
import { matchPattern, matchRouteClient, parseDataScript, parseTitle } from 'tinyary/client-routes'
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
const root = document.getElementById('tinyary-root')

function renderPage(pathname, parsed) {
  const match = matchRouteClient(manifest, pathname)
  if (!match) return false
  const { page, layouts, params } = match
  const tree = h(componentFor(page.file), { data: parsed.data.page, params: parsed.params, result: parsed.result })
  const fullTree = layouts.reduceRight(
    (child, layout) => h(componentFor(layout.file), null, child),
    tree,
  )
  render(null, root)
  render(fullTree, root)
  return true
}

function ensureProgress() {
  if (document.getElementById('tinyary-progress')) return
  const style = document.createElement('style')
  style.textContent = '#tinyary-progress{position:fixed;top:0;left:0;height:2px;width:0;background:#4f46e5;z-index:9999;transition:width .2s;pointer-events:none}html[data-navigating] #tinyary-progress{width:70%}'
  document.head.appendChild(style)
  const bar = document.createElement('div')
  bar.id = 'tinyary-progress'
  document.body.appendChild(bar)
}

ensureProgress()

let navigating = false

async function navigate(path, push = true) {
  if (navigating) return
  let url
  try { url = new URL(path, location.origin) } catch { location.href = path; return }
  if (url.origin !== location.origin) { location.href = path; return }
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return

  if (push) history.pushState({ path, scrollY: window.scrollY }, '', path)

  navigating = true
  document.documentElement.dataset.navigating = '1'

  try {
    const res = await fetch(path, { headers: { 'X-Tinyary-Navigate': '1' } })
    if (!res.ok) { location.href = path; return }
    const html = await res.text()
    const parsed = parseDataScript(html)
    if (!parsed) { location.href = path; return }
    const title = parseTitle(html)
    if (title) document.title = title
    const ok = renderPage(path, parsed)
    if (!ok) { location.href = path; return }

    if (!push) {
      const y = (history.state && typeof history.state.scrollY === 'number') ? history.state.scrollY : 0
      window.scrollTo(0, y)
    } else {
      window.scrollTo(0, 0)
    }
  } catch (error) {
    location.href = path
  } finally {
    navigating = false
    delete document.documentElement.dataset.navigating
  }
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented) return
  if (event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const anchor = event.target && event.target.closest ? event.target.closest('a') : null
  if (!anchor) return
  if (anchor.target && anchor.target !== '_self') return
  if (anchor.hasAttribute('download')) return
  if (anchor.getAttribute('rel') === 'external') return

  let url
  try { url = new URL(anchor.href, location.origin) } catch { return }
  if (url.origin !== location.origin) return
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return

  event.preventDefault()
  navigate(url.pathname + url.search)
})

document.addEventListener('submit', async (event) => {
  if (event.defaultPrevented) return
  const form = event.target
  if (!(form instanceof HTMLFormElement)) return

  const method = (form.method || 'get').toLowerCase()
  if (method !== 'get' && method !== 'post') return
  if (form.querySelector('input[type="file"]')) return

  const actionAttr = form.getAttribute('action') || location.pathname
  let url
  try { url = new URL(actionAttr, location.origin) } catch { return }
  if (url.origin !== location.origin) return

  event.preventDefault()

  if (method === 'get') {
    const params = new URLSearchParams(new FormData(form))
    navigate(url.pathname + '?' + params.toString())
    return
  }

  if (navigating) return
  navigating = true
  document.documentElement.dataset.navigating = '1'

  try {
    const body = new FormData(form)
    const res = await fetch(url.pathname + url.search, { method: 'POST', body })
    if (!res.ok) { form.submit(); return }

    const html = await res.text()
    const parsed = parseDataScript(html)
    if (!parsed) { form.submit(); return }

    const title = parseTitle(html)
    if (title) document.title = title

    const finalPath = res.redirected ? new URL(res.url).pathname : (url.pathname + url.search)
    const ok = renderPage(finalPath, parsed)
    if (!ok) { form.submit(); return }

    if (res.redirected) {
      try { history.pushState({ path: finalPath, scrollY: window.scrollY }, '', finalPath) } catch {}
    }

    window.scrollTo(0, 0)
  } catch (error) {
    form.submit()
  } finally {
    navigating = false
    delete document.documentElement.dataset.navigating
  }
})

window.addEventListener('popstate', () => {
  navigate(location.pathname + location.search, false)
})

window.addEventListener('scroll', () => {
  try { history.replaceState({ ...(history.state || {}), scrollY: window.scrollY }, '') } catch {}
}, { passive: true })

const pathname = window.location.pathname

const page = manifest.find(
  (route) => route.type === 'page' && matchPattern(route.path, pathname),
)

if (page && root) {
  const layouts = manifest
    .filter(
      (route) =>
        route.type === 'layout' &&
        (route.dir === '' || page.dir.startsWith(\`\${route.dir}/\`)),
    )
    .sort((a, b) => a.dir.length - b.dir.length || a.dir.localeCompare(b.dir))

  bootstrap({
    root,
    render: (data, params, result) => {
      const tree = h(componentFor(page.file), { data: data.page, params, result })
      return layouts.reduceRight(
        (child, layout) => h(componentFor(layout.file), null, child),
        tree,
      )
    },
  })

  try { history.replaceState({ path: window.location.pathname, scrollY: window.scrollY }, '') } catch {}
}
`
}
