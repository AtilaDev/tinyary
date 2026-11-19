import { island } from 'tinyary'
import { createAry, useAryState } from 'tinyary/arykit'

// Átomo de módulo: lo comparten las dos islas de la página.
const clicks = createAry(0, { debugLabel: 'clicks' })

function CounterDisplay() {
  const [count] = useAryState(clicks)

  return (
    <section>
      <p>
        Valor compartido: <strong>{count}</strong>
      </p>
    </section>
  )
}

function CounterButton() {
  const [, setCount] = useAryState(clicks)

  return (
    <section>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Incrementar átomo
      </button>
      <button type="button" onClick={() => setCount(0)}>
        Reiniciar
      </button>
    </section>
  )
}

export const Display = island(CounterDisplay)
export const Button = island(CounterButton)
