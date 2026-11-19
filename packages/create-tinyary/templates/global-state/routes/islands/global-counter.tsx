import { island } from 'tinyary'
import { createAry, useAryState } from 'tinyary/arykit'

// Átomo de módulo: la misma identidad para las dos islas de la página.
const clicks = createAry(0, { debugLabel: 'clicks' })

function DisplayCounter() {
  const [count] = useAryState(clicks)

  return (
    <section class="card">
      <p>
        Valor compartido: <strong>{count}</strong>
      </p>
    </section>
  )
}

function ControlCounter() {
  const [, setCount] = useAryState(clicks)

  return (
    <section class="card actions">
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Incrementar
      </button>
      <button type="button" onClick={() => setCount(0)}>
        Reiniciar
      </button>
    </section>
  )
}

export const Display = island(DisplayCounter)
export const Controls = island(ControlCounter)
