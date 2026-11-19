import { h } from 'preact'
import type { VNode } from 'preact'
import { createServer } from './server'
import type { RouteEntry } from './routes'
import type { LoadedModule } from './server'
import type { RequestCtx } from './types'

// Note: Vitest primitives (describe, it, expect, vi, ...) are intentionally
// NOT re-exported from here. Re-exporting them from a `link:`-ed package
// breaks in dev (two Vitest instances -> "No test suite found"). Import them
// directly from 'vitest' in your test files; tinyary/testing only provides the
// app-building helpers below.
export interface TestModule {
  default?: (props?: unknown) => unknown
  loader?: (ctx: RequestCtx) => Promise<unknown>
  action?: (ctx: RequestCtx & { form: FormData }) => Promise<unknown>
}

export interface CreateTestAppOptions {
  routes: RouteEntry[]
  modules: Record<string, TestModule>
  /** Custom render. Defaults to a small tree that dumps data/params/result. */
  render?: (opts: { page: RouteEntry; layouts: RouteEntry[]; data: Record<string, unknown>; params: Record<string, string>; result?: unknown }) => VNode
  session?: (ctx: RequestCtx) => Promise<{ id: string; name: string } | null>
  shell?: string
}

/**
 * Builds an in-memory Hono app from a route manifest + module map, ready to be
 * exercised with `app.fetch(new Request(...))`. Mirrors the pattern used by
 * TinyAry's own server tests.
 */
export function createTestApp(options: CreateTestAppOptions): {
  app: ReturnType<typeof createServer>
  render: (opts: any) => VNode
  loadModule: (file: string) => Promise<LoadedModule>
} {
  const render =
    options.render ??
    ((opts: { data: Record<string, unknown>; params: Record<string, string>; result?: unknown }) =>
      h(
        'div',
        null,
        h('pre', { id: 'data' }, JSON.stringify(opts.data)),
        h('pre', { id: 'params' }, JSON.stringify(opts.params)),
        h('pre', { id: 'result' }, JSON.stringify(opts.result ?? null)),
      ))

  const loadModule = async (file: string): Promise<LoadedModule> => {
    const mod = options.modules[file]
    if (!mod) throw new Error(`tinyary/testing: module not found: ${file}`)
    return mod as LoadedModule
  }

  const app = createServer({
    routes: options.routes,
    render: (opts) => render(opts),
    loadModule,
    session: options.session,
    shell: options.shell,
  })

  return { app, render: render as (opts: any) => VNode, loadModule }
}

/**
 * Convenience: fetch a path against a test app and return the response + text.
 */
export async function fetchApp(
  app: { fetch: (req: Request) => Response | Promise<Response> },
  path: string,
  init?: RequestInit,
): Promise<{ res: Response; text: string; status: number }> {
  const res = await app.fetch(new Request(`http://localhost${path}`, init))
  const text = await res.text()
  return { res, text, status: res.status }
}
