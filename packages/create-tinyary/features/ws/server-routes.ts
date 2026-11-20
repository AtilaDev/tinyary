// server-routes snippet for WebSocket (ws)
// El wizard inyecta esto en server.ts. Crea un WebSocketServer
// y lo monta en el upgrade del HTTP server.

import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ noServer: true })

// Broadcast a todos los clientes conectados
function broadcast(message: string) {
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(message)
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    broadcast(String(data))
  })
})

// Montar el upgrade handler en el servidor HTTP.
// Nota: esto requiere acceso al http.Server, que en dev mode de Vite
// se maneja internamente. En producción (start()), se puede montar
// con server.on('upgrade', ...).
// Para el demo, el chat funciona con el WebSocketServer en memoria.
