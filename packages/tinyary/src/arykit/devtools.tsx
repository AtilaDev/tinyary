import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import {
  getAtomHistory,
  getAtomKey,
  getDebugState,
  resetAry,
  setDebugValue,
  subscribeToDebug,
  type HistoryEntry,
} from './ary-atoms'
import {
  clearCache,
  getQueryDebugState,
  invalidateQueries,
  subscribeToQueries,
  type QueryDebugEntry,
} from './use-ary-query'

type RemoteAtom = {
  id: string
  value: unknown
  label?: string
  isPersistent: boolean
  history: HistoryEntry[]
}

function formatValue(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? 'undefined'
  } catch {
    return '[unserializable]'
  }
}

function formatAge(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  return seconds < 1 ? 'ahora' : `hace ${seconds}s`
}

export function AryDevTools({ remoteHost }: { remoteHost?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [atoms, setAtoms] = useState(getDebugState())
  const [queries, setQueries] = useState<QueryDebugEntry[]>(getQueryDebugState())
  const [search, setSearch] = useState('')
  const [history, setHistory] = useState<Map<symbol, HistoryEntry[]>>(new Map())

  // Posición del panel (top/left fijos, movidos por drag).
  const [windowPos, setWindowPos] = useState({ top: 0, left: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const socketRef = useRef<WebSocket | null>(null)

  const refreshState = useCallback(() => {
    if (remoteHost) return // En modo remoto manda el socket.

    const currentAtoms = getDebugState()
    setAtoms(currentAtoms)
    setQueries(getQueryDebugState())

    const nextHistory = new Map<symbol, HistoryEntry[]>()
    currentAtoms.forEach((_, id) => {
      nextHistory.set(id, getAtomHistory(id))
    })
    setHistory(nextHistory)
  }, [remoteHost])

  // Suscripción local o conexión al proxy remoto.
  useEffect(() => {
    if (remoteHost) {
      const socket = new WebSocket(`ws://${remoteHost}`)
      socketRef.current = socket

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as {
          type: string
          payload: RemoteAtom[]
        }

        if (message.type !== 'UPDATE_STATE') return

        const remoteAtoms = new Map<
          symbol,
          { value: unknown; label?: string; isPersistent: boolean }
        >()
        const remoteHistory = new Map<symbol, HistoryEntry[]>()

        message.payload.forEach((atom) => {
          const id = Symbol.for(atom.id)
          remoteAtoms.set(id, {
            value: atom.value,
            label: atom.label,
            isPersistent: atom.isPersistent,
          })
          remoteHistory.set(id, atom.history)
        })

        setAtoms(remoteAtoms)
        setHistory(remoteHistory)
      }

      return () => socket.close()
    }

    refreshState()
    const unsubscribeAtoms = subscribeToDebug(refreshState)
    const unsubscribeQueries = subscribeToQueries(refreshState)

    return () => {
      unsubscribeAtoms()
      unsubscribeQueries()
    }
  }, [remoteHost, refreshState])

  // Posición inicial una vez que existe window.
  useEffect(() => {
    if (typeof window === 'undefined') return

    setWindowPos({
      top: window.innerHeight - 600 - 20,
      left: window.innerWidth - 400 - 20,
    })
  }, [])

  const handleGlobalMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging.current) return

    setWindowPos({
      left: event.clientX - dragStart.current.x,
      top: event.clientY - dragStart.current.y,
    })
  }, [])

  const handleGlobalMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Listeners globales sólo mientras el panel está abierto.
  useEffect(() => {
    if (!isOpen) return

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isOpen, handleGlobalMouseMove, handleGlobalMouseUp])

  const toggleOpen = () => setIsOpen((prev) => !prev)

  const handleMouseDown = (event: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    isDragging.current = true
    dragStart.current = {
      x: event.clientX - windowPos.left,
      y: event.clientY - windowPos.top,
    }
  }

  const handleRestore = (id: symbol, value: unknown) => {
    if (remoteHost && socketRef.current) {
      socketRef.current.send(
        JSON.stringify({
          type: 'RESTORE',
          payload: { id: id.description ?? String(id), value },
        }),
      )
      return
    }

    setDebugValue(id, value, true)
  }

  const handleReset = (id: symbol) => {
    if (remoteHost && socketRef.current) {
      socketRef.current.send(
        JSON.stringify({
          type: 'RESET',
          payload: { id: id.description ?? String(id) },
        }),
      )
      return
    }

    resetAry(id)
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={toggleOpen}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #8e32e4ff, #3b82f6)',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
          cursor: 'pointer',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.transform = 'scale(1.1)'
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform = 'scale(1)'
        }}
        title="AryAtoms DevTools"
        aria-label="Abrir AryAtoms DevTools"
      >
        🛠️
      </button>
    )
  }

  const atomList = Array.from(atoms.entries()).filter(([, info]) => {
    const label = info.label ?? ''
    return label.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div
      style={{
        position: 'fixed',
        top: windowPos.top,
        left: windowPos.left,
        width: '400px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        color: '#f8fafc',
        fontFamily: "'Outfit', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '80vh',
        boxSizing: 'border-box',
        animation: isDragging.current ? 'none' : 'slideUp 0.3s ease-out',
      }}
    >
      {/* Header: handle de arrastre */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 700,
            background: 'linear-gradient(to right, #a855f7, #3b82f6)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            pointerEvents: 'none',
          }}
        >
          AryAtoms DevTools ✥
        </h3>
        <button
          type="button"
          onClick={toggleOpen}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '18px',
          }}
          aria-label="Cerrar AryAtoms DevTools"
        >
          ✕
        </button>
      </div>

      {/* Buscador */}
      <div style={{ padding: '0 16px 12px 16px' }}>
        <div style={{ position: 'relative', marginTop: '12px' }}>
          <input
            type="text"
            placeholder="Search atoms..."
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 32px 8px 12px',
              color: 'white',
              fontSize: '13px',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
              title="Clear search"
              aria-label="Limpiar búsqueda"
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Lista de átomos */}
      <div
        style={{
          padding: '0 16px 16px 16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flex: 1,
          minHeight: 0,
        }}
      >
        {atomList.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '14px' }}>
            No atoms found.
          </p>
        ) : (
          atomList.map(([id, info]) => (
            <AtomRow
              key={getAtomKey(id)}
              id={id}
              info={info}
              history={history.get(id) ?? []}
              onRestore={handleRestore}
              onReset={handleReset}
            />
          ))
        )}
      </div>

      {/* Caché de queries */}
      <div
        style={{
          padding: '12px 16px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          flexShrink: 0,
          maxHeight: '40%',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <h4
            style={{
              margin: 0,
              color: '#94a3b8',
              fontSize: '11px',
              textTransform: 'uppercase',
            }}
          >
            Queries ({queries.length})
          </h4>
          {queries.length > 0 && (
            <button
              type="button"
              onClick={() => clearCache()}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                color: '#fca5a5',
                padding: '2px 6px',
              }}
            >
              Clear all
            </button>
          )}
        </div>

        {queries.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
            No queries yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {queries.map((query) => (
              <div
                key={query.key}
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#e2e8f0',
                    }}
                  >
                    {query.key}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: query.stale ? '#f59e0b' : '#34d399',
                    }}
                  >
                    {query.stale ? 'stale' : 'fresh'} · {formatAge(query.timestamp)}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#a855f7',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '6px',
                    borderRadius: '4px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: '80px',
                    overflowY: 'auto',
                  }}
                >
                  {formatValue(query.data)}
                </div>
                <button
                  type="button"
                  onClick={() => invalidateQueries(query.key)}
                  style={{
                    marginTop: '6px',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    padding: '2px 6px',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  Invalidate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes flash {
          0% { background-color: rgba(16, 185, 129, 0.2); }
          100% { background-color: rgba(0, 0, 0, 0.2); }
        }
      `}</style>
    </div>
  )
}

function AtomRow({
  id,
  info,
  history,
  onRestore,
  onReset,
}: {
  id: symbol
  info: { value: unknown; label?: string; isPersistent: boolean }
  history: HistoryEntry[]
  onRestore: (id: symbol, value: unknown) => void
  onReset: (id: symbol) => void
}) {
  const [showHistory, setShowHistory] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  // Destello cuando cambia el valor.
  useEffect(() => {
    const row = rowRef.current
    if (!row) return

    row.style.animation = 'none'
    const timer = setTimeout(() => {
      row.style.animation = 'flash 1s ease'
    }, 0)

    return () => clearTimeout(timer)
  }, [info.value])

  return (
    <div
      ref={rowRef}
      style={{
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        padding: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {info.isPersistent && <span title="Persistent Storage">💾</span>}
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>
            {info.label ?? 'Atom'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={() => onReset(id)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#fca5a5',
              padding: '2px 6px',
            }}
            title="Reset to Initial"
            aria-label="Resetear al valor inicial"
          >
            🔄
          </button>
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#94a3b8',
              padding: '2px 6px',
            }}
            title="History"
            aria-label="Ver historial"
          >
            ⏳
          </button>
        </div>
      </div>

      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#a855f7',
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '8px',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {formatValue(info.value)}
      </div>

      {showHistory && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h4
            style={{
              color: '#94a3b8',
              fontSize: '11px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Time Travel (Last 10)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...history].reverse().map((entry, index) => (
              <div
                key={`${entry.timestamp}-${index}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: '#cbd5e1',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#64748b' }}>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      maxWidth: '100px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatValue(entry.value)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRestore(id, entry.value)}
                  style={{
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    padding: '2px 6px',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
