import { describe, it, expect } from 'vitest'
import { h } from 'preact'
import { renderSSR, serializeData, injectData } from '../src/render'

const HTML = '<!doctype html><html><body><div id="root">OLD</div></body></html>'

function payload(html = '<h1>Nuevo</h1>', data: Record<string, unknown> = { a: 1 }) {
  return { html, data, params: {}, result: null }
}

describe('renderSSR', () => {
  it('renderiza un vnode a HTML', () => {
    expect(renderSSR(h('h1', null, 'Hola'))).toContain('<h1>Hola</h1>')
  })

  it('renderiza componentes anidados', () => {
    expect(renderSSR(h('main', null, h('p', null, 'hola')))).toContain('<main><p>hola</p></main>')
  })
})

describe('serializeData', () => {
  it('serializa objetos a JSON', () => {
    expect(JSON.parse(serializeData({ a: 1 }))).toEqual({ a: 1 })
  })

  it('escapa los `<` para no cerrar el script', () => {
    const json = serializeData({ a: '</script>' })
    expect(json).not.toContain('</script>')
    expect(json).toContain('\\u003c')
  })

  it('el JSON escapado sigue siendo parseable', () => {
    expect(JSON.parse(serializeData({ a: '</script>' }))).toEqual({ a: '</script>' })
  })
})

describe('injectData', () => {
  it('reemplaza el contenido del root por el HTML renderizado', () => {
    const out = injectData(HTML, payload(), 'root')
    expect(out).not.toContain('OLD')
    expect(out).toContain('<div id="root"><h1>Nuevo</h1></div>')
  })

  it('agrega el script de datos antes de </body>', () => {
    const out = injectData(HTML, payload(), 'root')
    expect(out).toContain('<script id="__tinyary_data__" type="application/json">')
    expect(out.indexOf('__tinyary_data__')).toBeLessThan(out.indexOf('</body>'))
  })

  it('conserva el payload en el script', () => {
    const out = injectData(HTML, { html: '', data: { a: 1 }, params: {}, result: null }, 'root')
    expect(out).toContain('{"data":{"a":1},"params":{},"result":null}')
  })

  it('soporta contenido anidado con divs', () => {
    const nested = '<html><body><div id="root"><div>viejo</div></div></body></html>'
    const out = injectData(nested, payload(), 'root')
    expect(out).toContain('<div id="root"><h1>Nuevo</h1></div><script')
  })

  it('lanza si el root no existe', () => {
    expect(() => injectData('<html><body></body></html>', payload(), 'root')).toThrow(/#root/)
  })
})
