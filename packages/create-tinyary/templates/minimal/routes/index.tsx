import type { PageProps } from 'tinyary'

export const loader = async () => ({
  mensaje: 'Hola desde {{name}}',
})

export default function Home({ data }: PageProps<{ mensaje: string }>) {
  return (
    <main>
      <h1>{data.mensaje}</h1>
      <p>Editá routes/index.tsx y recargá para continuar.</p>
    </main>
  )
}
