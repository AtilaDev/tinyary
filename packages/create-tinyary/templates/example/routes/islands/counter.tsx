import { island, useState } from 'tinyary'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <section class="island">
      <h2>Isla interactiva</h2>
      <p>Esta es la única parte que se actualiza en el cliente.</p>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Clicks: {count}
      </button>
    </section>
  )
}

export default island(Counter)
