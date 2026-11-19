import Counter from './counter'

export default function CounterPage() {
  return (
    <main>
      <h1>Contador</h1>
      <p>El texto sale del servidor; el botón se activa al hidratar.</p>
      <Counter />
    </main>
  )
}
