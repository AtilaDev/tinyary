import { describe, it, expect } from 'vitest'
import { h } from 'preact'
import { createTestApp, fetchApp } from '../src/testing'
import type { RouteEntry } from '../src/routes'
import type { RequestCtx } from '../src/types'

const routes: RouteEntry[] = [
  { path: '/', file: 'index.tsx', type: 'page', dir: '' },
  { path: '/items/:id', file: 'items/[id]/index.tsx', type: 'page', dir: 'items/[id]' },
]

describe('createTestApp', () => {
  it('responde 200 y expone data/params', async () => {
    const modules = {
      'index.tsx': {
        default: () => null,
        loader: async () => ({ mensaje: 'hola' }),
      },
      'items/[id]/index.tsx': {
        default: () => null,
        loader: async (ctx: RequestCtx) => ({ id: ctx.params.id }),
      },
    }
    const { app } = createTestApp({ routes, modules })
    const { status, text } = await fetchApp(app, '/')
    expect(status).toBe(200)
    expect(text).toContain('"mensaje":"hola"')
  })

  it('maneja POST con action y result', async () => {
    const modules = {
      'index.tsx': {
        default: () => null,
        loader: async () => ({ count: 0 }),
        action: async (ctx: RequestCtx & { form: FormData }) => {
          const n = Number(ctx.form.get('n'))
          return { added: n }
        },
      },
    }
    const { app } = createTestApp({ routes: [routes[0]], modules })
    const form = new FormData()
    form.set('n', '5')
    const { status, text } = await fetchApp(app, '/', { method: 'POST', body: form })
    expect(status).toBe(200)
    expect(text).toContain('"added":5')
  })

  it('devuelve 404 si no hay ruta', async () => {
    const modules = { 'index.tsx': { default: () => null } }
    const { app } = createTestApp({ routes, modules })
    const { status } = await fetchApp(app, '/nope')
    expect(status).toBe(404)
  })
})
