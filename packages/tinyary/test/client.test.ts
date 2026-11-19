import { describe, it, expect, vi, afterEach } from 'vitest'
import { hydrate } from 'preact'
import type { VNode } from 'preact'
import { bootstrap, island } from '../src/client'

vi.mock('preact', async (importOriginal) => {
  const preact = await importOriginal<typeof import('preact')>()
  return { ...preact, hydrate: vi.fn() }
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('island', () => {
  it('devuelve el mismo componente', () => {
    const Counter = () => null
    expect(island(Counter)).toBe(Counter)
  })
})

describe('bootstrap', () => {
  it('lee el payload, invoca render y hidrata sobre el root', () => {
    const root = { id: 'tinyary-root' } as HTMLElement
    const script = {
      textContent: '{"data":{"page":{"mensaje":"Hola"}},"params":{"id":"42"},"result":null}',
    }
    vi.stubGlobal('document', {
      getElementById: vi.fn((id: string) => (id === '__tinyary_data__' ? script : null)),
    })

    const vnode = { type: 'main' } as VNode
    const render = vi.fn(() => vnode)

    bootstrap({ root, render })

    expect(render).toHaveBeenCalledWith({ page: { mensaje: 'Hola' } }, { id: '42' })
    expect(hydrate).toHaveBeenCalledWith(vnode, root)
  })

  it('falla con un mensaje claro si falta el payload', () => {
    vi.stubGlobal('document', { getElementById: () => null })

    expect(() =>
      bootstrap({ root: {} as HTMLElement, render: () => ({}) as VNode }),
    ).toThrow(/__tinyary_data__/)
    expect(hydrate).not.toHaveBeenCalled()
  })
})
