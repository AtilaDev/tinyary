import { describe, it, expect, vi } from 'vitest'
import { loader, action, redirect, notFound } from '../src/index'
import type { ActionCtx, RequestCtx } from '../src/types'

describe('loader', () => {
  it('devuelve la misma función (identidad tipada)', () => {
    const fn = async () => ({ a: 1 })
    expect(loader(fn)).toBe(fn)
  })

  it('la función devuelta se ejecuta con el ctx', async () => {
    const fn = vi.fn(async (ctx: RequestCtx) => ({ id: ctx.params.id }))
    const wrapped = loader(fn)

    await expect(wrapped({ params: { id: '7' } } as unknown as RequestCtx)).resolves.toEqual({ id: '7' })
  })
})

describe('action', () => {
  it('devuelve la misma función (identidad tipada)', () => {
    const fn = async (_ctx: ActionCtx) => ({ ok: true })
    expect(action(fn)).toBe(fn)
  })
})

describe('redirect', () => {
  it('lanza un Error con message TINYARY_REDIRECT', () => {
    expect(() => redirect('/login')).toThrowError('TINYARY_REDIRECT')
  })

  it('expone el destino en .to', () => {
    try {
      redirect('/login')
    } catch (error) {
      expect((error as Error & { to: string }).to).toBe('/login')
    }
  })

  it('es un Error de verdad', () => {
    try {
      redirect('/x')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
    }
  })
})

describe('notFound', () => {
  it('lanza un Error con message TINYARY_NOT_FOUND', () => {
    expect(() => notFound()).toThrowError('TINYARY_NOT_FOUND')
  })

  it('es un Error de verdad', () => {
    try {
      notFound()
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
    }
  })
})
