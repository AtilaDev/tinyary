import type { RequestCtx } from 'tinyary'
import { unsealSession, COOKIE_NAME } from './lib/session'

export const session = async (ctx: RequestCtx): Promise<{ id: string; name: string } | null> => {
  const cookieValue = ctx.cookies.get(COOKIE_NAME)
  if (!cookieValue) return null

  const data = await unsealSession(cookieValue)
  if (!data?.userId) return null

  return { id: data.userId, name: data.username || 'user' }
}
