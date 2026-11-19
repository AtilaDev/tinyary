import type { PageProps } from 'tinyary'
import Counter from './islands/counter'

type Data = {
  mensaje: string
  generadoEn: string
  pasos: string[]
}

export const loader = async (): Promise<Data> => ({
  mensaje: 'Hola desde {{name}}',
  generadoEn: new Date().toISOString(),
  pasos: [
    'El loader corre en el servidor.',
    'El HTML llega completo en la primera respuesta.',
    'Sólo la isla del contador se hidrata y cambia en el navegador.',
  ],
})

export default function Home({ data }: PageProps<Data>) {
  return (
    <main>
      <h1>{data.mensaje}</h1>
      <p>
        Renderizado en el servidor el <code>{data.generadoEn}</code>.
      </p>
      <ol>
        {data.pasos.map((paso) => (
          <li key={paso}>{paso}</li>
        ))}
      </ol>
      <Counter />
    </main>
  )
}
