import { island, useSignal } from 'tinyary'

function SignalsCounter({ inicial }: { inicial: number }) {
  const count = useSignal(inicial)

  return (
    <section>
      <p>
        Valor: <strong>{count}</strong>
      </p>
      <button type="button" onClick={() => count.value++}>
        Incrementar signal
      </button>
    </section>
  )
}

export default island(SignalsCounter)
