// server-routes snippet for iron-session
// The wizard injects this into server.ts before app.route('/', pages)

import { sealSession } from './lib/session'
import { setCookie, deleteCookie } from 'hono/cookie'
import * as v from 'valibot'

const loginSchema = v.object({
  username: v.pipe(v.string(), v.minLength(1, 'Username is required.')),
  password: v.pipe(v.string(), v.minLength(1, 'Password is required.')),
})

// POST /auth/login — validate, set signed cookie, redirect
app.post('/auth/login', async (c) => {
  const form = await c.req.formData()
  const username = String(form.get('username') ?? '')
  const password = String(form.get('password') ?? '')

  // Validación con valibot
  const result = v.safeParse(loginSchema, { username, password })
  if (!result.success) {
    const field = result.issues[0]?.path?.[0]?.key || 'username'
    const msg = result.issues[0]?.message || 'Validation error'
    return c.redirect(`/login?error=${encodeURIComponent(msg)}&field=${field}&username=${encodeURIComponent(username)}`)
  }

  // Validación de credenciales
  if (username !== 'admin' || password !== 'tinyary') {
    return c.redirect(`/login?error=${encodeURIComponent('Invalid credentials.')}&field=password&username=${encodeURIComponent(username)}`)
  }

  const sealed = await sealSession({ userId: '1', username })
  setCookie(c, 'tinyary-session', sealed, { path: '/', httpOnly: true, sameSite: 'Lax', maxAge: 60 * 60 * 24 * 7 })
  return c.redirect('/')
})

// POST/GET /auth/logout — clear the cookie
const logout = async (c: any) => {
  deleteCookie(c, 'tinyary-session', { path: '/' })
  return c.redirect('/')
}
app.post('/auth/logout', logout)
app.get('/auth/logout', logout)
