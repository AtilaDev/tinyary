import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { app as pages } from 'virtual:tinyary/server-entry'

const app = new Hono()

// Endpoint JSON del ejemplo. Se registra antes de montar las páginas.
app.get('/api/time', (c) =>
  c.json({
    mensaje: 'Respuesta de /api/time',
    ahora: new Date().toISOString(),
  }),
)

app.route('/', pages)

export { app }

export function start() {
  const port = Number(process.env.PORT ?? 3000)

  return serve({ fetch: app.fetch, port }, () => {
    console.log(`tinyary en http://localhost:${port}`)
  })
}
