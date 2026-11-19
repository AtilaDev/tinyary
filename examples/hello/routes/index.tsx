import type { PageProps } from 'tinyary'

export const loader = async () => ({
  mensaje: 'Hola desde el servidor',
  ahora: new Date().toISOString(),
})

export default function Home({ data }: PageProps<{ mensaje: string; ahora: string }>) {
  return (
    <main>
      <h1>{data.mensaje}</h1>
      <p>
        Renderizado en el servidor a las <code>{data.ahora}</code>
      </p>
    </main>
  )
}
