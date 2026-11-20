import type { PageProps } from 'tinyary'

export const loader = async () => ({
  mensaje: 'Hello from {{name}}',
})

export default function Home({ data }: PageProps<{ mensaje: string }>) {
  return (
    <main>
      <h1>{data.mensaje}</h1>
      <p>Project generated with the TinyAry wizard.</p>
      <p>Edit <code>routes/index.tsx</code> and reload to continue.</p>
    </main>
  )
}
