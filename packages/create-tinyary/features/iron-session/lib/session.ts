// lib/session.ts
//
// Rol: sesiones firmadas con iron-session. La sesión vive en una cookie cifrada
// (sin store externo). Usamos sealData/unsealData (bajo nivel) para que
// funcione con el Map de cookies de TinyAry, sin necesitar el Context de Hono.

import { sealData, unsealData } from 'iron-session'

export type SessionData = {
  userId?: string
  username?: string
}

const password = process.env.IRON_SESSION_PASSWORD || 'complex_password_at_least_32_characters_long_dev_only'

export const COOKIE_NAME = 'tinyary-session'

export async function sealSession(data: SessionData): Promise<string> {
  return sealData(data, { password })
}

export async function unsealSession(value: string): Promise<SessionData | null> {
  try {
    return await unsealData<SessionData>(value, { password })
  } catch {
    return null
  }
}