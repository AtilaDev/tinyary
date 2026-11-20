// routes/chat/index.tsx
//
// Rol: chat en tiempo real con WebSocket. El cliente se conecta a /ws
// y envía/recibe mensajes. El servidor (en server.ts) hace broadcast.

import type { PageProps } from 'tinyary'

export default function ChatPage() {
  return (
    <section class="page">
      <h1>Chat en tiempo real</h1>
      <p class="lead">Los mensajes se envían por WebSocket y se broadcastean a todos.</p>

      <div id="chat-log" style="border:1px solid #30363d; padding:1rem; min-height:200px; margin-bottom:1rem; overflow-y:auto;"></div>

      <form id="chat-form" style="display:flex; gap:0.5rem;">
        <input type="text" id="chat-input" placeholder="Escribí un mensaje..." style="flex:1;" autocomplete="off" />
        <button type="submit">Enviar</button>
      </form>

      <script dangerouslySetInnerHTML={{ __html: `
        const log = document.getElementById('chat-log')
        const input = document.getElementById('chat-input')
        const form = document.getElementById('chat-form')
        const ws = new WebSocket('ws://' + location.host + '/ws')
        ws.onmessage = (e) => {
          const p = document.createElement('p')
          p.textContent = e.data
          log.appendChild(p)
          log.scrollTop = log.scrollHeight
        }
        form.onsubmit = (e) => {
          e.preventDefault()
          if (input.value.trim()) {
            ws.send(input.value.trim())
            input.value = ''
          }
        }
      ` }} />
    </section>
  )
}
