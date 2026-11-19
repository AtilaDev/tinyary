import { island } from 'tinyary'
import { invalidateQueries, useAryQuery } from 'tinyary/arykit'

type TimeData = {
  mensaje: string
  ahora: string
}

async function fetchTime(): Promise<TimeData> {
  const response = await fetch('/api/time')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  return response.json() as Promise<TimeData>
}

function QueryPanelContent() {
  const { data, isLoading, error, refetch } = useAryQuery<TimeData>(
    'time',
    fetchTime,
    { staleTime: 5_000 },
  )

  return (
    <section class="card">
      <h2>Consulta</h2>
      {isLoading && <p>Cargando…</p>}
      {error && <p class="error">Error: {String(error)}</p>}
      {data && (
        <>
          <p>{data.mensaje}</p>
          <p>
            <code>{data.ahora}</code>
          </p>
        </>
      )}
      <div class="actions">
        <button type="button" onClick={refetch}>
          Refetch
        </button>
        <button type="button" onClick={() => invalidateQueries('time')}>
          Invalidar caché
        </button>
      </div>
    </section>
  )
}

export const QueryPanel = island(QueryPanelContent)
