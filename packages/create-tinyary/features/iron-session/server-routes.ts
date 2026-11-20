// server-routes snippet for iron-session
// The wizard injects this into server.ts before app.route('/', pages)

import { sealSession } from './lib/session'
import { setCookie, deleteCookie } from 'hono/cookie'

// POST /auth/login — validate credentials, set signed cookie, redirect
app.post('/auth/login', async (c) => {
  const form = await c.req.formData()
  const username = String(form.get('username') ?? '').trim()
  const password = String(form.get('password') ?? '')

  if (username === 'admin' && password === 'tinyary') {
    const sealed = await sealSession({ userId: '1', username })
    setCookie(c, 'tinyary-session', sealed, { path: '/', httpOnly: true, sameSite: 'Lax', maxAge: 60 * 60 * 24 * 7 })
    return c.redirect('/')
  }

  return c.redirect('/login?error=1')
})

// POST/GET /auth/logout — clear the cookie
const logout = async (c: any) => {
  deleteCookie(c, 'tinyary-session', { path: '/' })
  return c.redirect('/')
}
app.post('/auth/logout', logout)
app.get('/auth/logout', logout)
