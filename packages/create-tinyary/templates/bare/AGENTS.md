# AGENTS.md — TinyAry

Este archivo describe el mini framework con el que se generó este proyecto, para
que cualquier agente (o persona) pueda entenderlo y modificarlo sin leer todo el
código fuente.

## Qué es este proyecto

Proyecto generado con `create-tinyary`. Usa **TinyAry**, un mini framework
fullstack experimental: Preact + Vite + Hono + TypeScript estricto.

- SSR real: los loaders corren en el servidor y el HTML sale completo.
- Hidratación en el cliente con `bootstrap` e islas con `island()`.
- Router de archivos: cada carpeta bajo `routes/` con un `index.tsx` es una página.
- Sin navegación cliente: cada link hace un request completo al servidor.

No es un framework de producción. El foco es entender el flujo fullstack.

## Stack y comandos

```bash
pnpm install        # instalar dependencias
pnpm dev            # dev server (Vite, SSR on demand)
pnpm exec tsc --noEmit   # typecheck
```

El puerto por defecto es 3000 (`PORT=4000 pnpm dev` para cambiarlo).

Dependencias clave: `tinyary` (el framework), `preact`, `hono`, `@hono/node-server`,
`vite`, `@preact/preset-vite`. `tinyary` apunta a un checkout local via
`link:` mientras no esté publicado.

## Estructura

```
.
├── index.html              # shell con <div id="tinyary-root">
├── vite.config.ts          # plugin tinyary + preact + dedupe
├── server.ts               # re-exporta app/start de virtual:tinyary/server-entry
├── tinyary.config.ts       # sesión (stub)
├── styles/global.css       # CSS global
├── routes/                 # páginas y layouts (file-based routing)
│   ├── index.tsx           # ruta "/"
│   ├── layout.tsx          # layout raíz (envuelve todas las páginas)
│   └── <nombre>/index.tsx  # ruta "/<nombre>"
└── lib/                    # (sólo en algunos templates) helpers de servidor
```

Sólo `index.tsx` define páginas y sólo `layout.tsx` define layouts. Otros
nombres de archivo (`counter.tsx`, `lib/todos.ts`) **no son rutas**.

## El modelo fullstack: quién corre dónde

Esta es la parte más importante. Hay **un solo árbol de componentes** que se
renderiza dos veces (servidor y navegador), pero no todo el código corre en
ambos lados.

### Corre en el SERVIDOR

- `loader` — función async por request (GET/POST). Acceso a `ctx`.
- `action` — función async en POST. Recibe `form: FormData`.
- `session` en `tinyary.config.ts` — una vez por request.
- SSR render (`renderSSR`) — genera el HTML.
- Endpoints Hono que registres en `server.ts`.

### Corre en el NAVEGADOR

- `bootstrap` (generado por el plugin) — hidrata el árbol.
- Hooks (`useState`, `useEffect`, …) y signals — durante hidratación y después.
- Event handlers (`onClick`, `onSubmit`, …) — **sólo** en el navegador.
- AryKit (`useAryState`, `useAryQuery`) — corren en ambos, pero el estado no se serializa.

### Corre en AMBOS lados

El **cuerpo del componente** (la función que devuelve JSX) se ejecuta en el
servidor (para generar HTML) y en el navegador (para hidratar y re-renderizar).
Por eso:

- No pongas `fetch`, `localStorage`, `document` ni side effects en el cuerpo del
  componente sin guardarlo en `useEffect`.
- `useEffect`/`useLayoutEffect` y los event handlers se **ignoran** en el
  servidor.
- Los loaders **nunca** corren en el navegador.

### Regla de oro

> Si toca filesystem, DB, cookies, sesiones o secretos → `loader`/`action` o
> endpoint Hono.
> Si toca DOM, eventos del usuario o estado local → cuerpo del componente o hook.

## Rutas, loaders y actions

### Convenciones

- Sólo `index.tsx` define páginas.
- `[id]` se convierte en `:id` y llega como `params.id`.
- Un `layout.tsx` aplica a los **descendientes** de su carpeta, no al
  `index.tsx` de esa misma carpeta.
- El `layout.tsx` de la raíz aplica a todas las páginas.
- El loader se exporta como `loader`; el action de un POST, como `action`.

### Página mínima

```tsx
// routes/index.tsx
import type { PageProps, RequestCtx } from 'tinyary'

export const loader = async (ctx: RequestCtx) => ({
  mensaje: 'Hola desde el servidor',
})

export default function Home({ data }: PageProps<{ mensaje: string }>) {
  return <h1>{data.mensaje}</h1>
}
```

### Ruta dinámica

```tsx
// routes/items/[id]/index.tsx
import type { PageProps, RequestCtx } from 'tinyary'

export const loader = async ({ params }: RequestCtx) => ({
  item: await db.get(params.id),
})

export default function Item({ data, params }: PageProps) {
  return <h1>{data.item.title} ({params.id})</h1>
}
```

### Formulario (POST / action)

```tsx
// routes/login/index.tsx
import { redirect, notFound } from 'tinyary'
import type { ActionCtx, PageProps } from 'tinyary'

export const action = async (ctx: ActionCtx) => {
  const email = ctx.form.get('email')
  if (!email) notFound()
  // ...validar...
  redirect('/dashboard')
}

export default function Login({ result }: PageProps<{}, { error?: string }>) {
  return (
    <form method="post">
      <input name="email" type="email" />
      <button type="submit">Entrar</button>
      {result?.error && <p>{result.error}</p>}
    </form>
  )
}
```

`redirect(to)` lanza un control error → 303. `notFound()` → 404. Cualquier
otro error → 500.

### Layout

```tsx
// routes/layout.tsx
import type { ComponentChildren } from 'tinyary'

export default function RootLayout({ children }: { children?: ComponentChildren }) {
  return (
    <>
      <nav><a href="/">Inicio</a></nav>
      <main>{children}</main>
    </>
  )
}
```

## Pasar datos del servidor al cliente

El flujo es:

```
loader (server) → data → payload (__tinyary_data__) → bootstrap → props del componente
```

El componente recibe `data` como prop tanto en SSR como en hidratación. Para
continuar un valor del servidor en el cliente, pasalo como prop desde el loader
y usalo como semilla de `useState`/`useSignal`.

**Importante**: el estado (`useState`, `useSignal`) no se serializa. El SSR pinta
el estado inicial y el cliente arranca otra vez desde ese inicial.

## Estado e interactividad

Toda la página se hidrata. `island()` hoy es sólo un marcador.

```tsx
import { island, useState, useSignal } from 'tinyary'

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount((v) => v + 1)}>{count}</button>
}

export default island(Counter)
```

Signals (sin transform de Babel):

```tsx
function Counter({ inicial }: { inicial: number }) {
  const count = useSignal(inicial)
  return <button onClick={() => count.value++}>{count}</button>
}
```

Hooks disponibles desde `tinyary`: `useState`, `useEffect`, `useLayoutEffect`,
`useMemo`, `useRef`, `useCallback`, `useReducer`, `useContext`, `useId`.
Signals: `signal`, `computed`, `effect`, `batch`, `untracked`, `useSignal`,
`useComputed`, `useSignalEffect`.

## Estado compartido entre islas (AryKit)

Subpath opt-in: `tinyary/arykit`.

```tsx
import { island } from 'tinyary'
import { createAry, useAryState } from 'tinyary/arykit'

const clicks = createAry(0, { debugLabel: 'clicks' })

function Display() {
  const [count] = useAryState(clicks)
  return <p>Valor: <strong>{count}</strong></p>
}

export const DisplayIsland = island(Display)
```

- `createAry(valorInicial, opciones)` crea un átomo compartido.
- `useAryState(atom)` devuelve `[valor, setValor]`.
- `persist: 'clave'` guarda en `localStorage`.
- `useAryQuery` / `useAryMutation` para server state con caché.
- `AryDevTools` panel flotante para inspeccionar/resetear/time-travel.

La persistencia es SSR-safe: el primer render usa el valor inicial y el valor
guardado se aplica después de hidratar.

## Reglas de estado y SSR

- El estado no se serializa. Para continuar un valor del servidor, pasalo como
  prop desde el loader.
- No uses signals ni átomos de AryKit a nivel de módulo para estado por
  request: en SSR el módulo se comparte entre requests y filtra estado. Para
  datos por request usá el loader.
- No accedas a `document`/`window`/`localStorage` en el cuerpo del componente
  sin guardarlo en `useEffect`.
- No uses valores no determinísticos (`Math.random`, `Date.now`) en el cuerpo
  del componente sin guardarlos: rompen la hidratación.

## Server HTTP, sesión, cookies

El servidor se arma con `createServer` (en `tinyary/server`). El proyecto suele
tener sólo:

```ts
// server.ts
export { app, start } from 'virtual:tinyary/server-entry'
```

### Sesión

`tinyary.config.ts` exporta `session`:

```ts
import type { RequestCtx } from 'tinyary'

export const session = async (ctx: RequestCtx) => {
  const token = ctx.cookies.get('token')
  if (!token) return null
  return { id: '1', name: 'Ada' }
}
```

Se ejecuta una vez por request antes del loader; el resultado queda en
`ctx.user` (`{ id, name } | null`). Hoy es un stub (no valida cookies firmadas).

### Contexto disponible (`RequestCtx`)

`request`, `url`, `params`, `query`, `cookies` (Map), `user`.

### Control de flujo

- `redirect(to)` → 303.
- `notFound()` → 404.
- Cualquier otro error → log + body `"500"`.

## Endpoints JSON propios

Si necesitás rutas que no son páginas (API JSON), registrá un Hono propio y
montá las páginas después:

```ts
// server.ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { app as pages } from 'virtual:tinyary/server-entry'

const app = new Hono()

app.get('/api/time', (c) =>
  c.json({ mensaje: 'ok', ahora: new Date().toISOString() }),
)

app.route('/', pages)

export { app }
export function start() {
  const port = Number(process.env.PORT ?? 3000)
  return serve({ fetch: app.fetch, port }, () => {
    console.log(`tinyary en http://localhost:${port}`)
  })
}
```

## Imports: qué importar de dónde

| Subpath | Qué exporta | Dónde se usa |
|---|---|---|
| `tinyary` | hooks, signals, `island`, `matchPattern`, tipos, `redirect`/`notFound`/`loader`/`action` | app y navegador |
| `tinyary/server` | `createServer`, `scanRoutes`, `matchRoute`, `renderSSR`, `injectData` | sólo servidor (importa `node:fs`) |
| `tinyary/vite` | plugin `tinyary()` | `vite.config.ts` |
| `tinyary/client` | `bootstrap`, `island` | generado por el plugin |
| `tinyary/client-routes` | `matchPattern` browser-safe | generado por el plugin |
| `tinyary/arykit` | átomos, queries, DevTools | opt-in |

La raíz de `tinyary` es browser-safe: no arrastra `node:fs`. Lo server-only
vive en `tinyary/server`.

## Vite config (no tocar sin motivo)

```ts
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { tinyary } from 'tinyary/vite'

export default defineConfig({
  plugins: [preact(), tinyary()],
  appType: 'custom',            // las páginas las sirve el middleware SSR
  resolve: { dedupe: ['preact'] },
  optimizeDeps: { include: ['preact', 'preact/hooks', 'preact/compat'] },
  server: { port: Number(process.env.PORT ?? 3000) },
  build: { target: 'esnext' },  // top-level await en virtual components
  ssr: { noExternal: true },    // tinyary publica TS fuente
})
```

- `appType: 'custom'` evita el fallback SPA de Vite.
- `resolve.dedupe: ['preact']` evita dos instancias de Preact (rompería la
  hidratación).
- `optimizeDeps.include` con `preact/compat` es necesario para AryKit.

## Agregar una ruta nueva

1. Crear `routes/<nombre>/index.tsx` (o `routes/[id]/index.tsx` para dinámica).
2. Exportar un componente default y, si hace falta, `loader`/`action`.
3. El plugin detecta el archivo y hace full-reload en dev.
4. Agregar el link en `routes/layout.tsx` (o en la página).

## Agregar una isla interactiva

```tsx
import { island, useState } from 'tinyary'

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount((v) => v + 1)}>{count}</button>
}

export default island(Counter)
```

`island()` es la identidad: marca el componente como interactivo. Hoy toda la
página se hidrata igual; la carga selectiva queda para otra etapa.

## Tareas comunes

- **Leer un archivo/DB en una página**: ponerlo en el `loader`.
- **Manejar un form**: ponerlo en el `action`, usar `<form method="post">`.
- **Compartir estado entre islas**: usar AryKit (`createAry`).
- **Agregar un endpoint JSON**: registrar en `server.ts` antes de `app.route('/', pages)`.
- **Cambiar estilos**: editar `styles/global.css` (se sirve como asset estático).

## Gotchas

- No uses `Math.random()`/`Date.now()` en el cuerpo del componente sin
  guardarlo: rompe la hidratación.
- No uses signals/átomos de módulo para estado por request en SSR.
- No accedas a `document`/`window` fuera de `useEffect`.
- `preact` es peer dependency: la app lo instala y deduplica. No instales una
  segunda copia.
- Los todos/estado en memoria se resetean al reiniciar el servidor.

## Más info

- `README.md` del framework (en el repo de TinyAry) tiene la guía completa.
- Tests: `pnpm test`. Smoke end-to-end: `pnpm smoke`.
