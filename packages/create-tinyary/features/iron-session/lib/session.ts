// lib/session.ts
//
// Role: signed sessions with iron-session. The session lives in an encrypted
// cookie (no external store). The encryption password comes from
// IRON_SESSION_PASSWORD (min. 32 chars). In dev, if not set, an insecure
// default is used.

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
