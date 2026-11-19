import { AryDevTools } from 'tinyary/arykit'
import { Controls, Display } from './islands/global-counter'

export default function Home() {
  return (
    <main>
      <h1>Global state con AryKit</h1>
      <p>
        Dos islas comparten un átomo de módulo. El servidor manda el HTML
        inicial; el cliente hidrata el estado y lo mantiene entre ambas.
      </p>
      <Display />
      <Controls />
      <p>
        Abrí el botón <strong>🛠️</strong> para ver el átomo, su historial y el
        time travel.
      </p>
      <AryDevTools />
    </main>
  )
}
