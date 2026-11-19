import { island, useState } from 'tinyary'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <section>
      <p>
        Valor: <strong>{count}</strong>
      </p>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Incrementar
      </button>
    </section>
  )
}

export default island(Counter)
