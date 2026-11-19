import { AryDevTools } from 'tinyary/arykit'
import { QueryPanel } from './islands/query-panel'

export default function Home() {
  return (
    <main>
      <h1>useAryQuery</h1>
      <p>
        El servidor renderiza esta página; la isla pide <code>/api/time</code>,
        cachea la respuesta y permite invalidarla.
      </p>
      <QueryPanel />
      <p>
        El botón <strong>🛠️</strong> muestra la caché de queries y permite
        invalidarla desde el panel.
      </p>
      <AryDevTools />
    </main>
  )
}
