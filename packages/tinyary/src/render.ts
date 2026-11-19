import { renderToString } from 'preact-render-to-string'
import type { VNode } from 'preact'
import type { Params } from './types'

export type InjectPayload = {
  /** HTML ya renderizado que reemplaza el contenido del root. */
  html: string
  data: Record<string, unknown>
  params: Params
  result?: unknown
}

export function renderSSR(tree: VNode): string {
  return renderToString(tree)
}

export function serializeData(data: unknown): string {
  // `<` escapado evita cerrar el <script> con datos del usuario.
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/**
 * Reemplaza el contenido del root y agrega el JSON de hidratación.
 * DECISIÓN: el HTML renderizado viaja dentro de `payload.html` para respetar
 * la firma de 3 argumentos; el script sólo serializa `data`, `params` y `result`.
 */
export function injectData(html: string, payload: InjectPayload, rootId: string): string {
  const openTag = `<div id="${rootId}">`
  const start = html.indexOf(openTag)

  if (start === -1) {
    throw new Error(`TinyAry: root #${rootId} no encontrado`)
  }

  const contentStart = start + openTag.length
  const end = findClosingDiv(html, contentStart)

  if (end === -1) {
    throw new Error(`TinyAry: root #${rootId} no encontrado`)
  }

  const { html: rendered, data, params, result = null } = payload

  const withRoot = `${html.slice(0, start)}${openTag}${rendered}</div>${html.slice(end + '</div>'.length)}`

  const script = `<script id="__tinyary_data__" type="application/json">${serializeData({
    data,
    params,
    result,
  })}</script>`

  const bodyEnd = withRoot.lastIndexOf('</body>')

  // DECISIÓN: sin `</body>` (HTML parcial) el script se agrega al final.
  return bodyEnd === -1
    ? withRoot + script
    : `${withRoot.slice(0, bodyEnd)}${script}${withRoot.slice(bodyEnd)}`
}

/** Encuentra el `</div>` que cierra el div abierto antes de `from`, contando anidados. */
function findClosingDiv(html: string, from: number): number {
  let depth = 1
  let index = from

  while (index < html.length) {
    const nextOpen = html.indexOf('<div', index)
    const nextClose = html.indexOf('</div>', index)

    if (nextClose === -1) return -1
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      index = nextOpen + '<div'.length
      continue
    }

    depth--
    if (depth === 0) return nextClose
    index = nextClose + '</div>'.length
  }

  return -1
}
