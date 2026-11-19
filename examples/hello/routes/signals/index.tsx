import SignalsCounter from './signals-counter'

export const loader = async () => ({
  inicial: 10,
})

export default function SignalsPage({ data }: { data: { inicial: number } }) {
  return (
    <main>
      <h1>Signals</h1>
      <p>
        El valor inicial viene del loader; el cliente lo usa como semilla del
        signal.
      </p>
      <SignalsCounter inicial={data.inicial} />
    </main>
  )
}
