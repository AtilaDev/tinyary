import type { RequestCtx } from 'tinyary'

/** En esta etapa no hay auth real: siempre anónimo. */
export const session = async (_ctx: RequestCtx): Promise<{ id: string; name: string } | null> => {
  return null
}
