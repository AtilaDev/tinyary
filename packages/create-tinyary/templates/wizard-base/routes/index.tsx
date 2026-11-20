import type { PageProps } from 'tinyary'

export const loader = async () => ({
  mensaje: 'Hola desde {{name}}',
})

export default function Home({ data }: PageProps<{ mensaje: string }>) {
  return (
    <main>
      <h1>{data.mensaje}</h1>
      <p>Proyecto generado con el wizard de TinyAry.</p>
      <p>Editá <code>routes/index.tsx</code> y recargá para continuar.</p>
    </main>
  )
}