# TinyAry

Mini framework web **fullstack** para proyectos personales. Preact + Vite + Hono + TypeScript estricto, sin capas mágicas. SSR real, hidratación en el cliente e islas interactivas, con router de archivos.

> No es un framework de producción. No tiene RSC, Flight, resumability ni compilador propio. El foco es entender el flujo completo de un request fullstack: qué corre en el servidor, qué se manda al navegador y qué se hidrata.

## Índice

- [Qué es](#qué-es)
- [Qué no es](#qué-no-es)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Inicio rápido](#inicio-rápido)
- [El modelo fullstack: servidor vs. cliente](#el-modelo-fullstack-servidor-vs-cliente)
- [Flujo de un request (SSR)](#flujo-de-un-request-ssr)
- [Hidratación](#hidratación)
- [Rutas, loaders y actions](#rutas-loaders-y-actions)
- [Layouts](#layouts)
- [Pasar datos del servidor al cliente](#pasar-datos-del-servidor-al-cliente)
- [Estado e interactividad](#estado-e-interactividad)
- [AryKit (estado compartido y server state)](#arykit-estado-compartido-y-server-state)
- [Reglas de estado y SSR](#reglas-de-estado-y-ssr)
- [Server HTTP: Hono, sesión, cookies, redirect, 404](#server-http-hono-sesión-cookies-redirect-404)
- [Endpoints JSON propios](#endpoints-json-propios)
- [Virtual modules](#virtual-modules)
- [Plugin de Vite](#plugin-de-vite)
- [Superficie de imports (`tinyary` / `tinyary/server` / …)](#superficie-de-imports-tinyary--tinyaryserver--)
- [CLI `create-tinyary`](#cli-create-tinyary)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Tests, smoke y typecheck](#tests-smoke-y-typecheck)
- [Pendiente](#pendiente)

## Qué es

- **Router de archivos**: `routes/index.tsx`, `routes/<nombre>/index.tsx`, `routes/[id]/index.tsx` y `routes/layout.tsx`.
- **SSR real**: los loaders corren en el servidor y el HTML sale completo en la primera respuesta.
- **Hidratación en el cliente** con `bootstrap` e islas interactivas con `island()`.
- **Server HTTP sobre Hono** con GET/POST, `redirect`, `notFound`, layouts anidados y sesión inyectable.
- **Plugin de Vite** que genera los virtual modules, sirve SSR en dev y agrega el entry cliente al HTML.
- **Ejemplo `hello`** con rutas `/`, `/counter`, `/signals` y `/arykit`.
- **CLI `create-tinyary`** que genera un proyecto desde template.

## Qué no es

- No es un framework de producción.
- No hay RSC, Flight, resumability ni compilador propio.
- No hay navegación cliente: cada link hace un request completo al servidor.
- No hay base de datos, autenticación real ni sesión con cookies firmadas.
- No hay build de producción con manifest; el foco de esta etapa es el flujo de desarrollo con Vite.

## Requisitos

- Node 24+
- pnpm 10+

## Instalación

```bash
pnpm install
```

## Inicio rápido

Levantá el ejemplo incluido:

```bash
pnpm --filter hello dev
# http://localhost:3000/
```

Cambiar el puerto:

```bash
PORT=4000 pnpm --filter hello dev
```

O generá un proyecto nuevo con la CLI:

```bash
node packages/create-tinyary/bin.js mi-app
cd mi-app
pnpm install
pnpm dev
```

Sin `--template` la CLI pregunta qué ejemplo querés (ver [CLI](#cli-create-tinyary)).

## El modelo fullstack: servidor vs. cliente

Esta es la parte que más confunde. TinyAry tiene **un solo árbol de componentes** que se renderiza dos veces: una en el servidor y otra en el navegador. Pero no todo el código corre en ambos lados.

### Qué corre en el servidor

| Pieza | Dónde | Notas |
|---|---|---|
| `loader` | `routes/.../index.tsx` | Función async. Corre en cada request GET/POST. Tiene acceso a `ctx` (request, params, query, cookies, user). |
| `action` | `routes/.../index.tsx` | Corre en POST. Recibe `form: FormData` además del contexto. |
| `session` | `tinyary.config.ts` | Se ejecuta una vez por request antes del loader. |
| `scanRoutes` | `tinyary/vite` | En build/dev, lee el filesystem. |
| SSR render | `tinyary/server` | Renderiza el árbol a string HTML. |
| Endpoints Hono | `server.ts` del proyecto | Cualquier ruta extra que registres. |

### Qué corre en el navegador

| Pieza | Dónde | Notas |
|---|---|---|
| `bootstrap` | `tinyary/client` | Lee `#__tinyary_data__` e hidrata el árbol. |
| `island()` | marcador | No hace nada en runtime; sólo marca componentes interactivos. |
| Hooks (`useState`, `useEffect`, …) | componentes | Durante la hidratación y después. |
| Signals (`useSignal`, …) | componentes | Igual que los hooks. |
| Event handlers (`onClick`, …) | componentes | **Sólo** en el navegador. En SSR se renderizan como atributos. |
| AryKit (`useAryState`, `useAryQuery`) | componentes | Corren en ambos lados, pero el estado no se serializa. |

### Qué corre en **ambos** lados

El **cuerpo del componente** (la función que devuelve JSX) se ejecuta tanto en el servidor (para generar HTML) como en el navegador (para hidratar y re-renderizar). Por eso:

- No pongas `fetch`, `localStorage`, `document`, ni efectos con side effects en el cuerpo del componente sin guardarlo en `useEffect`.
- `useEffect`, `useLayoutEffect` y los event handlers se **ignoran** en el servidor (Preact no los ejecuta durante `renderToString`).
- Los loaders **nunca** corren en el navegador. Para obtener datos en el cliente después de la carga inicial, usá `useAryQuery` o un `fetch` manual dentro de un `useEffect`.

### Regla de oro

> **Si toca el filesystem, la base de datos, cookies, sesiones o secretos, va en el `loader`/`action` o en un endpoint Hono.**  
> **Si toca el DOM, eventos del usuario o estado local del componente, va en el cuerpo del componente o en un hook.**

## Flujo de un request (SSR)

```
navegador                  Vite (dev)                 Hono (server.ts → virtual:tinyary/server-entry)
   │                          │                              │
   │  GET /counter            │                              │
   │ ───────────────────────► │                              │
   │                          │  middleware SSR               │
   │                          │ ───────────────────────────► │
   │                          │                              │  matchRoute(routes, '/counter')
   │                          │                              │  loadModule(page.file)   ← import dinámico
   │                          │                              │  session(ctx)            ← tinyary.config.ts
   │                          │                              │  action (sólo si POST)
   │                          │                              │  loader(ctx)             ← tu loader
   │                          │                              │  render({page, layouts, data, params})
   │                          │                              │  renderSSR(tree)         ← HTML string
   │                          │                              │  injectData(shell, payload, rootId)
   │                          │ ◄─────────────────────────── │  c.html(html)  (200)
   │ ◄─────────────────────── │                              │
   │                          │                              │
   │  parsea HTML             │                              │
   │  ejecuta client-entry    │                              │
   │  bootstrap lee           │                              │
   │  #__tinyary_data__       │                              │
   │  hydrate(render(data))   │                              │
```

Detalles importantes:

1. **Un solo módulo de la page por request**: se carga una vez y se reusa para el action y el loader.
2. **POST corre el action y después los loaders**, para renderizar con datos frescos.
3. **Los layouts con loader aportan datos** al payload, keyed por archivo (`data['routes/layout.tsx']`). Un layout sin loader no ensucia el payload.
4. **Errores**: `redirect(to)` lanza un control error → 303. `notFound()` → 404. Cualquier otro error → se loguea con `console.error` y el body es exactamente `"500"`.
5. **El HTML del servidor incluye el script** `<script id="__tinyary_data__" type="application/json">` con `{ data, params, result }`. Ese script es el puente entre servidor y cliente.

## Hidratación

En el navegador, `virtual:tinyary/client-entry` (generado por el plugin) hace esto:

1. Busca la page del manifest que coincide con `location.pathname`.
2. Arma la lista de layouts (raíz siempre; los demás, sólo descendientes).
3. Llama a `bootstrap({ root, render })`, que:
   - Lee `#__tinyary_data__`.
   - Llama a `render(data, params)` para reconstruir el mismo árbol que el servidor.
   - Ejecuta `hydrate(tree, root)` de Preact.

Como el servidor y el cliente usan **el mismo componente** y **los mismos datos**, Preact puede reusar el DOM existente en lugar de re-renderizarlo. Por eso:

- El HTML del servidor y el primer render del cliente **deben coincidir**. Si no coinciden, Preact avisa en la consola y el árbol se descarta.
- Los valores iniciales de `useState`/`useSignal` deben ser determinísticos o venir del loader. No uses `Math.random()` ni `Date.now()` en el cuerpo del componente sin guardarlo.
- La persistencia de AryKit se aplica **después** de hidratar (en un microtask) precisamente para no romper este invariante.

## Rutas, loaders y actions

### Convenciones de archivos

- Sólo `index.tsx` define páginas.
- `[id]` se convierte en `:id` y llega como `params.id`.
- Un `layout.tsx` aplica a los **descendientes** de su carpeta, no al `index.tsx` de esa misma carpeta.
- El `layout.tsx` de la raíz aplica a todas las páginas.
- `nope.tsx` (u otros nombres) **no es ruteable**.

### Una página mínima

```tsx
// routes/index.tsx
import type { PageProps } from 'tinyary'

export const loader = async () => ({
  mensaje: 'Hola desde el servidor',
})

export default function Home({ data }: PageProps<{ mensaje: string }>) {
  return <h1>{data.mensaje}</h1>
}
```

### Tipado de loader/action

```ts
import { loader, action, redirect, notFound } from 'tinyary'

export const loader = loader(async (ctx) => {
  // ctx: { request, url, params, query, cookies, user }
  return { items: await db.list() }
})

export const action = action(async (ctx) => {
  // ctx.form es FormData
  const name = ctx.form.get('name')
  if (!name) notFound()
  await db.create(String(name))
  redirect('/items')
})
```

`loader()` y `action()` son **identidades tipadas**: no envuelven la función, sólo aportan inferencia. `redirect` y `notFound` lanzan control errors; no devuelven.

### Ruta dinámica

```tsx
// routes/items/[id]/index.tsx
import type { PageProps } from 'tinyary'

export const loader = async ({ params }) => ({
  item: await db.get(params.id),
})

export default function Item({ data, params }: PageProps) {
  return <h1>{data.item.title} ({params.id})</h1>
}
```

### Formulario (POST)

```tsx
// routes/login/index.tsx
import { action, redirect } from 'tinyary'
import type { PageProps } from 'tinyary'

export const action = action(async ({ form }) => {
  const email = form.get('email')
  // ...validar...
  redirect('/dashboard')
})

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

El `result` del action se pasa al componente como prop y también viaja en el payload de hidratación.

## Layouts

Un layout envuelve a las páginas de su subárbol:

```tsx
// routes/layout.tsx  (raíz, aplica a todas)
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

```tsx
// routes/items/layout.tsx  (sólo descendientes de /items)
export default function ItemsLayout({ children }) {
  return <section className="items">{children}</section>
}
```

Reglas:

- Un layout **no** envuelve al `index.tsx` de su misma carpeta. `/items` usa el layout raíz, no `items/layout.tsx`.
- Los layouts se anidan de afuera hacia adentro (raíz primero, hoja al final).
- Un layout puede tener `loader`; sus datos se inyectan al payload keyed por archivo.

## Pasar datos del servidor al cliente

El flujo es:

```
loader (server)  →  data  →  payload.__tinyary_data__  →  bootstrap  →  props del componente
```

Por eso el componente recibe `data` como prop tanto en SSR como en hidratación:

```tsx
export const loader = async () => ({ inicial: 10 })

export default function Page({ data }: PageProps<{ inicial: number }>) {
  return <Counter inicial={data.inicial} />
}
```

Y el componente hijo usa ese valor como semilla de su estado:

```tsx
function Counter({ inicial }: { inicial: number }) {
  const count = useSignal(inicial)
  return <button onClick={() => count.value++}>{count}</button>
}
```

**Importante**: el estado (`useState`, `useSignal`) **no se serializa**. El SSR pinta el estado inicial y el cliente arranca otra vez desde ese inicial. Para continuar un valor del servidor, pasalo como prop desde el loader (como arriba). No intentes "hidratar" un `useState` desde `localStorage` esperando que el servidor lo conozca.

## Estado e interactividad

Toda la página se hidrata. `island()` hoy es sólo un marcador: no hace carga selectiva ni separa el bundle.

### `useState`

```tsx
import { useState } from 'tinyary'

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount((v) => v + 1)}>{count}</button>
}
```

### Signals

```tsx
import { useSignal } from 'tinyary'

function Counter({ inicial }: { inicial: number }) {
  const count = useSignal(inicial)
  return <button onClick={() => count.value++}>{count}</button>
}
```

Leer `count.value` en el JSX alcanza: el componente se suscribe y vuelve a renderizar. No hace falta configurar el transform de Babel; Preact signals funciona sin compilador.

### `island()`

```tsx
import { island, useState } from 'tinyary'

function Counter() { /* ... */ }

export default island(Counter)
```

`island` es la identidad: devuelve el mismo componente. Sirve como marcador semántico ("esta parte es interactiva") y como punto de extensión para una futura hidratación selectiva. Hoy toda la página se hidrata igual.

### Hooks disponibles

Desde `tinyary`: `useState`, `useEffect`, `useLayoutEffect`, `useMemo`, `useRef`, `useCallback`, `useReducer`, `useContext`, `useId`.  
Signals desde `tinyary`: `signal`, `computed`, `effect`, `batch`, `untracked`, `useSignal`, `useComputed`, `useSignalEffect`.

## AryKit (estado compartido y server state)

Subpath opt-in: `tinyary/arykit`. Vive aparte para que el DevTools no se cargue en todas las páginas.

```tsx
import { island } from 'tinyary'
import { createAry, useAryState } from 'tinyary/arykit'

const clicks = createAry(0, { debugLabel: 'clicks' })

function Display() {
  const [count] = useAryState(clicks)
  return <p>Valor: <strong>{count}</strong></p>
}

function Controls() {
  const [, setCount] = useAryState(clicks)
  return <button onClick={() => setCount((v) => v + 1)}>+1</button>
}

export const DisplayIsland = island(Display)
export const ControlsIsland = island(Controls)
```

El mismo átomo se comparte entre islas de la misma página (y entre páginas si es de módulo).

- `createAry(valorInicial, opciones)` crea un átomo.
- `useAryState(atom)` devuelve `[valor, setValor]` y se suscribe a los cambios.
- `persist: 'clave'` guarda en `localStorage` (o en el `storage` que pases).
- `useAryQuery` y `useAryMutation` cubren server state con caché, refetch e invalidación.
- `AryDevTools` es un panel flotante para inspeccionar átomos, resetearlos y hacer time travel.

La persistencia es **SSR-safe**: el primer render usa el valor inicial y el valor guardado se aplica después de hidratar. Así el HTML del servidor y el primer render del cliente coinciden.

AryKit usa `useSyncExternalStore` de `preact/compat`; no necesita React ni una copia extra de Preact.

### `useAryQuery`

```tsx
import { useAryQuery, invalidateQueries } from 'tinyary/arykit'

type TimeData = { mensaje: string; ahora: string }

async function fetchTime(): Promise<TimeData> {
  const res = await fetch('/api/time')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function Panel() {
  const { data, isLoading, error, refetch } = useAryQuery<TimeData>(
    'time',
    fetchTime,
    { staleTime: 5_000 },
  )

  return (
    <section>
      {isLoading && <p>Cargando…</p>}
      {error && <p>Error: {String(error)}</p>}
      {data && <p>{data.mensaje} — <code>{data.ahora}</code></p>}
      <button onClick={refetch}>Refetch</button>
      <button onClick={() => invalidateQueries('time')}>Invalidar caché</button>
    </section>
  )
}
```

Opciones: `enabled`, `staleTime`, `cacheTime`. La caché es global por `queryKey`; `invalidateQueries(key)` (o `clearCache()`) avisa a todos los consumidores. El `AryDevTools` lista la caché y permite invalidar desde el panel.

## Reglas de estado y SSR

- **El estado no se serializa.** El SSR pinta el estado inicial y el cliente arranca otra vez desde ese inicial; para continuar un valor del servidor, pasalo como prop desde el loader.
- **No uses signals ni átomos de AryKit a nivel de módulo para estado por request**: en SSR ese módulo se comparte entre requests y filtra estado. Para datos por request usá el loader.
- **`useState` y `useSignal` conviven**; elegí uno por componente. AryKit es una tercera opción, útil cuando varias islas comparten estado.
- **No accedas a `document`/`window`/`localStorage` en el cuerpo del componente** sin guardarlo en `useEffect` (se ejecuta también en el servidor).
- **No uses valores no determinísticos** (`Math.random`, `Date.now`) en el cuerpo del componente sin guardarlos; rompen la hidratación.

## Server HTTP: Hono, sesión, cookies, redirect, 404

El servidor se arma con `createServer` (en `tinyary/server`) a partir del manifest de rutas. El plugin lo expone como `virtual:tinyary/server-entry`. El `server.ts` de un proyecto suele ser sólo:

```ts
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

Se ejecuta una vez por request antes del loader; el resultado queda en `ctx.user` (tipado `{ id, name } | null`). Hoy es un stub: no valida cookies firmadas.

### Contexto disponible (`RequestCtx`)

```ts
interface RequestCtx {
  request: Request
  url: URL
  params: Params
  query: URLSearchParams
  cookies: Map<string, string>
  user: { id: string; name: string } | null
}
```

### Control de flujo

- `redirect(to)` lanza un control error → respuesta **303** hacia `to`.
- `notFound()` → **404**.
- Cualquier otro error → log + body `"500"`.

### Cookies

Se parsean del header `Cookie` en un `Map<string, string>`. Para setear cookies de respuesta, registrá un middleware Hono propio o un endpoint (ver abajo).

## Endpoints JSON propios

Si necesitás rutas que no son páginas (API JSON, webhooks), registrá un Hono propio y montá las páginas después:

```ts
// server.ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { app as pages } from 'virtual:tinyary/server-entry'

const app = new Hono()

// API antes de las páginas (el catch-all de createServer respondería 404).
app.get('/api/time', (c) =>
  c.json({ mensaje: 'Respuesta de /api/time', ahora: new Date().toISOString() }),
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

El template `server-state` de la CLI hace exactamente esto.

## Virtual modules

El plugin expone cuatro módulos:

- `virtual:tinyary/routes`: manifest de rutas escaneadas (`RouteEntry[]`).
- `virtual:tinyary/components`: componentes cargados con top-level await.
- `virtual:tinyary/server-entry`: app Hono y arranque.
- `virtual:tinyary/client-entry`: entry del navegador que hidrata la página actual.

En el cliente, `tinyary/routes` se resuelve a una copia browser-safe de `matchPattern` para no arrastrar `node:fs` al bundle.

## Plugin de Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { tinyary } from 'tinyary/vite'

export default defineConfig({
  plugins: [preact(), tinyary()],
  appType: 'custom',            // el plugin responde las páginas con SSR
  resolve: { dedupe: ['preact'] },
  optimizeDeps: { include: ['preact', 'preact/hooks', 'preact/compat'] },
  server: { port: Number(process.env.PORT ?? 3000) },
  build: { target: 'esnext' },  // top-level await en virtual:tinyary/components
  ssr: { noExternal: true },   // tinyary publica TS fuente para el workspace
})
```

Puntos clave:

- `appType: 'custom'`: evita el fallback SPA de Vite; las páginas las sirve el middleware SSR del plugin.
- `resolve.dedupe: ['preact']`: una sola instancia de Preact. Sin esto, el paquete con peer de `preact-render-to-string` puede resolverse como segunda instancia y romper la hidratación.
- `optimizeDeps.include` con `preact/compat`: necesario para AryKit.
- En dev, el plugin **vigila** la carpeta `routes/` y hace full-reload cuando se agregan o borran archivos.

## Superficie de imports (`tinyary` / `tinyary/server` / …)

| Subpath | Qué exporta | Dónde se usa |
|---|---|---|
| `tinyary` | hooks, signals, `island`, `matchPattern`, tipos, `redirect`/`notFound`/`loader`/`action` | app y navegador |
| `tinyary/server` | `createServer`, `createCache`, `scanRoutes`, `matchRoute`, `renderSSR`, `injectData`, `serializeData` | sólo servidor (importa `node:fs`) |
| `tinyary/vite` | plugin `tinyary()` | `vite.config.ts` |
| `tinyary/client` | `bootstrap`, `island` | generado por el plugin |
| `tinyary/client-routes` | `matchPattern` browser-safe | generado por el plugin |
| `tinyary/routes` | tipos de rutas | generado por el plugin |
| `tinyary/arykit` | átomos, queries, DevTools | opt-in |

La raíz de `tinyary` es **browser-safe**: no arrastra `node:fs` ni `preact-render-to-string`. Lo server-only vive en `tinyary/server`.

## CLI `create-tinyary`

Desde el directorio donde querés crear el proyecto:

```bash
node /ruta/a/tinyary/packages/create-tinyary/bin.js mi-app
cd mi-app
pnpm install
pnpm dev
```

### Templates

| Template | Qué muestra |
|---|---|
| `bare` (default) | `routes/index.tsx` con un loader y un hola mundo. Sin islas ni AryKit. |
| `global-state` | Dos islas comparten un átomo de `tinyary/arykit`; incluye `AryDevTools`. |
| `server-state` | `useAryQuery` contra `/api/time`, refetch, invalidación y `AryDevTools`. |

```bash
node .../bin.js mi-app --template global-state
node .../bin.js mi-app --template server-state
node .../bin.js mi-app -t server-state
node .../bin.js mi-app --template=server-state
```

Sin `--template`, la CLI muestra un menú numerado y pregunta qué ejemplo querés:

```text
¿Qué ejemplo querés crear?

  1. bare           hola mundo, sin AryKit ni código de relleno (default)
  2. global-state   estado global con átomos y DevTools
  3. server-state   useAryQuery con caché, refetch y DevTools

Elegí un número (1-3) [1]:
```

Acepta número, nombre o alias (`minimal` → `bare`). Enter vacío usa `bare`. Sin terminal interactiva (CI, pipes) no pregunta y usa el default, así nunca queda esperando. `minimal` sigue funcionando como alias de `bare`.

Todos incluyen `index.html`, `vite.config.ts`, `server.ts`, `tinyary.config.ts` y `styles/global.css`. El template `server-state` usa un Hono propio en `server.ts` para registrar `/api/time` antes de montar las páginas.

El template apunta a este checkout con `link:<ruta absoluta>`, porque todavía no está publicado en un registry.

## Estructura

```text
packages/tinyary/             núcleo, plugin de Vite y cliente
packages/tinyary/src/arykit/  átomos, server state y DevTools
packages/create-tinyary/      CLI y templates (bare, global-state, server-state)
examples/hello/               ejemplo con Vite e isla de contador
scripts/smoke.mjs             validación end-to-end
```

## Tests, smoke y typecheck

```bash
pnpm test        # suite de Vitest (104 tests)
pnpm smoke       # levanta Vite y valida SSR, CSS, 404 y /counter, /signals, /arykit
pnpm -r exec tsc --noEmit
```

El smoke arranca el ejemplo en un puerto libre, hace requests reales y apaga el grupo de procesos al terminar.

## Pendiente

- Navegación cliente sin recarga.
- Cache conectado al `ctx` del request.
- Sesión real con cookies firmadas.
- Build de producción con manifest y assets hasheados.
- Hidratación selectiva (hoy `island()` es sólo un marcador).
- Publicar `tinyary` y `create-tinyary` en un registry.