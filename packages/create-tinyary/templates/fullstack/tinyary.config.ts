import type { RequestCtx } from 'tinyary'

export const session = async (_ctx: RequestCtx): Promise<{ id: string; name: string } | null> => {
  return null
}
