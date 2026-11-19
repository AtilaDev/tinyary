import type { ActionCtx, RequestCtx } from './types'

export type Loader = (ctx: RequestCtx) => Promise<unknown>
export type Action = (ctx: ActionCtx) => Promise<unknown>

/** Identidad tipada: sólo aporta inferencia, no envuelve la función. */
export function loader<T extends Loader>(fn: T): T {
  return fn
}

/** Identidad tipada: sólo aporta inferencia, no envuelve la función. */
export function action<T extends Action>(fn: T): T {
  return fn
}

function controlError(message: string): Error {
  const error = new Error(message)
  // El stack no aporta para errores de control de flujo.
  error.stack = undefined
  return error
}

/** Corta el request y responde 303 hacia `to`. */
export function redirect(to: string): never {
  const error = controlError('TINYARY_REDIRECT') as Error & { to: string }
  error.to = to
  throw error
}

/** Corta el request y responde 404. */
export function notFound(): never {
  throw controlError('TINYARY_NOT_FOUND')
}

export type { Params, RequestCtx, ActionCtx, LoaderResult, PageProps } from './types'

// Superficie universal (browser-safe). Lo server-only (cache, scanRoutes,
// renderSSR) vive en tinyary/server, porque routes.ts importa node:fs.
export type { ComponentChildren } from 'preact'

export {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
  useReducer,
  useContext,
  useId,
} from 'preact/hooks'

export {
  signal,
  computed,
  effect,
  batch,
  untracked,
  useSignal,
  useComputed,
  useSignalEffect,
} from '@preact/signals'

export type { Signal } from '@preact/signals'

export { island } from './client'
export { matchPattern } from './client-routes'
