// server-routes snippet for iron-session
// El wizard inyecta esto en server.ts antes de app.route('/', pages)

import { sealSession } from './lib/session'

// POST /auth/login — valida credenciales, setea cookie firmada, redirige
app.post('/auth/login', async (c) => {
  const form = await c.req.formData()
  const username = String(form.get('username') ?? '').trim()
  const password = String(form.get('password') ?? '')

  if (username === 'admin' && password === 'tinyary') {
    const sealed = await sealSession({ userId: '1', username })
    c.cookie('tinyary-session', sealed, { path: '/', httpOnly: true, sameSite: 'Lax', maxAge: 60 * 60 * 24 * 7 })
    return c.redirect('/')
  }

  return c.redirect('/login?error=1')
})

// POST/GET /auth/logout — borra la cookie
const logout = async (c: any) => {
  c.cookie('tinyary-session', '', { path: '/', maxAge: 0 })
  return c.redirect('/')
}
app.post('/auth/logout', logout)
app.get('/auth/logout', logout)
