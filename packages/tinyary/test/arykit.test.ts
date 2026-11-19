import { describe, expect, it } from 'vitest'
import { h } from 'preact'
import { renderToString } from 'preact-render-to-string'
import * as arykit from '../src/arykit'
import {
  createAry,
  getAtomHistory,
  getAtomKey,
  getDebugState,
  resetAry,
  setDebugValue,
  subscribeToDebug,
  useAryState,
  type AryStorage,
} from '../src/arykit/ary-atoms'

describe('AryKit', () => {
  it('expone la API pública desde tinyary/arykit', () => {
    expect(typeof arykit.configureAry).toBe('function')
    expect(typeof arykit.createAry).toBe('function')
    expect(typeof arykit.useAryState).toBe('function')
    expect(typeof arykit.useAryQuery).toBe('function')
    expect(typeof arykit.useAryMutation).toBe('function')
    expect(typeof arykit.invalidateQueries).toBe('function')
    expect(typeof arykit.clearCache).toBe('function')
    expect(typeof arykit.AryDevTools).toBe('function')
  })

  it('crea un átomo con valor inicial y metadatos', () => {
    const atom = createAry(0, { debugLabel: 'contador' })

    expect(typeof atom).toBe('symbol')
    expect(getDebugState().get(atom)).toEqual({
      value: 0,
      label: 'contador',
      isPersistent: false,
    })
  })

  it('usa el valor inicial durante SSR', () => {
    const atom = createAry(7, { debugLabel: 'ssr' })

    function Counter() {
      const [value] = useAryState(atom)
      return h('span', null, String(value))
    }

    expect(renderToString(h(Counter, {}))).toBe('<span>7</span>')
  })

  it('actualiza el valor y notifica a los suscriptores de DevTools', () => {
    const atom = createAry(0, { debugLabel: 'notificado' })
    const valores: unknown[] = []
    const unsubscribe = subscribeToDebug(() => {
      valores.push(getDebugState().get(atom)?.value)
    })

    setDebugValue(atom, 1)
    unsubscribe()
    setDebugValue(atom, 2)

    expect(valores).toEqual([1])
  })

  it('resetea un átomo a su valor inicial', () => {
    const atom = createAry('inicial', { debugLabel: 'reset' })

    setDebugValue(atom, 'cambiado')
    resetAry(atom)

    expect(getDebugState().get(atom)?.value).toBe('inicial')
  })

  it('guarda historial y lo limita a las últimas 10 entradas', () => {
    const atom = createAry(0, { debugLabel: 'historial' })

    for (let value = 1; value <= 12; value++) {
      setDebugValue(atom, value)
    }

    const history = getAtomHistory(atom)

    expect(history).toHaveLength(10)
    expect(history[0]?.value).toBe(3)
    expect(history.at(-1)?.value).toBe(12)
  })

  it('no duplica entradas consecutivas iguales en el historial', () => {
    const atom = createAry(0, { debugLabel: 'sin-duplicados' })

    setDebugValue(atom, 1)
    setDebugValue(atom, 1)

    expect(getAtomHistory(atom)).toHaveLength(1)
  })

  it('genera claves únicas aunque dos átomos compartan etiqueta', () => {
    const primero = createAry(1, { debugLabel: 'mismo-nombre' })
    const segundo = createAry(2, { debugLabel: 'mismo-nombre' })

    expect(getAtomKey(primero)).not.toBe(getAtomKey(segundo))
  })

  it('hidrata y persiste con un storage custom', async () => {
    const writes: Array<[string, string]> = []
    const storage: AryStorage = {
      getItem: (key) =>
        key === 'arykit:persist' ? JSON.stringify('guardado') : null,
      setItem: (key, value) => {
        writes.push([key, value])
      },
      removeItem: () => {},
    }

    const atom = createAry('inicial', {
      persist: 'arykit:persist',
      storage,
      debugLabel: 'persistente',
    })

    // El primer render usa el valor inicial: seguro para SSR.
    expect(getDebugState().get(atom)).toEqual({
      value: 'inicial',
      label: 'persistente',
      isPersistent: true,
    })

    // El valor persistido entra después, en un microtask.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getDebugState().get(atom)?.value).toBe('guardado')

    setDebugValue(atom, 'nuevo')

    expect(writes).toEqual([['arykit:persist', JSON.stringify('nuevo')]])
  })

  it('renderiza AryDevTools en SSR sin tocar window', () => {
    const html = renderToString(h(arykit.AryDevTools, { remoteHost: undefined }))

    expect(html).toContain('Abrir AryAtoms DevTools')
  })
})
