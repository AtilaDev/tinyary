import { hydrate } from 'preact'
import type { VNode } from 'preact'
import type { Params } from './types'

export interface BootstrapOptions {
  root: HTMLElement
  render: (data: Record<string, unknown>, params: Params) => VNode
}

/** Hidrata la página SSR con el payload insertado por injectData. */
export function bootstrap({ root, render }: BootstrapOptions): void {
  const script = document.getElementById('__tinyary_data__')

  if (!script) {
    throw new Error('TinyAry: no se encontró #__tinyary_data__ para hidratar')
  }

  const payload = JSON.parse(script.textContent ?? '{}') as {
    data: Record<string, unknown>
    params: Params
  }

  hydrate(render(payload.data, payload.params), root)
}

/** Marca un componente interactivo. La carga selectiva queda para otra etapa. */
export function island<T>(Component: T): T {
  return Component
}
