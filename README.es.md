# TinyAry

> [English](./README.md) | Español

Mini framework **fullstack** para proyectos personales. Preact + Vite + Hono +
TypeScript estricto. SSR real, hidratación en el cliente, router de archivos.

> No es un framework de producción. Sirve para entender el flujo completo de un
> request: qué corre en el servidor, qué se manda al navegador y qué se hidrata.

## En 30 segundos

- Cada archivo `routes/<algo>/index.tsx` es una página con su propia URL.
- El `loader` de esa página corre en el **servidor** y devuelve datos.
- El componente se renderiza a HTML en el servidor (SSR) y se **hidrata** en el
  navegador.
- El `action` corre en el servidor cuando llega un `POST` (formularios).
- `island()` marca un componente como interactivo (hoy toda la página se
  hidrata igual).

**Regla de oro:** si toca filesystem, DB, cookies o secretos → `loader`/`action`
o endpoint Hono. Si toca DOM, eventos o estado local → componente o hook.

## Requisitos

- Node 24+
- pnpm 10+

## Inicio rápido

Levantá el ejemplo incluido:

```bash
pnpm install
pnpm --filter hello dev
# http://localhost:3000/
```

O generá un proyecto nuevo:

```bash
node packages/create-tinyary/bin.js mi-app
cd mi-app
pnpm install
pnpm dev
```

Sin `--template` la CLI pregunta qué ejemplo querés (ver [CLI](#cli-create-tinyary)).

## Servidor vs. cliente (la parte que más confunde)

Hay **un solo árbol de componentes** que se renderiza dos veces (servidor y
navegador), pero no todo el código corre en ambos lados.

| Corre en el **servidor** | Corre en el **navegador** | Corre en **ambos** |
|---|---|---|
| `loader` (por request) | `bootstrap` (hidratación) | Cuerpo del componente (JSX) |
| `action` (en POST) | Hooks y signals | |
| `session` (`tinyary.config.ts`) | Event handlers (`onClick`, …) | |
| SSR render | | |
| Endpoints Hono | | |
| | | AryKit — Store en módulo, evaluado en ambos lados. En SSR el estado es el inicial (no se serializa); en el cliente persiste y se hidrata. |

Consecuencias prácticas:

- **No pongas** `fetch`, `localStorage`, `document` ni side effects en el cuerpo
  del componente sin guardarlo en `useEffect`.
- `useEffect` y los event handlers se **ignoran** en el servidor.
- Los loaders **nunca** corren en el navegador: para datos en cliente usá
  `useAryQuery` o un `fetch` dentro de `useEffect`.
- El estado (`useState`, `useSignal`) **no se serializa**. Para continuar un
  valor del servidor, pasalo como prop desde el loader.

## Flujo de un request (SSR)

```
navegador  →  Vite (dev)  →  Hono (server.ts)
                                  │
                                  ├─ matchRoute(path)        # qué página/layout
                                  ├─ loadModule(page)        # import dinámico
                                  ├─ session(ctx)            # tinyary.config.ts
                                  ├─ action(ctx)             # sólo si POST
                                  ├─ loader(ctx)             # tus datos
                                  ├─ render(...)             # árbol Preact
                                  ├─ renderSSR(tree)         # HTML string
                                  └─ injectData(shell, …)    # inyecta HTML + JSON
                                  │
navegador  ←  HTML completo con <script id="__tinyary_data__">
                                  │
                                  └─ bootstrap lee el JSON e hidrata
```

El script `#__tinyary_data__` es el puente entre servidor y cliente: lleva
`{ data, params, result }`.

## Rutas, loaders y actions

### Convenciones de archivos

- Sólo `index.tsx` define páginas.
- `[id]` se convierte en `:id` y llega como `params.id`.
- Un `layout.tsx` aplica a los **descendientes** de su carpeta, no al
  `index.tsx` de esa misma carpeta.
- El `layout.tsx` de la raíz aplica a todas las páginas.

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

### Formulario (POST)

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

- `redirect(to)` → respuesta 303.
- `notFound()` → 404.
- Cualquier otro error → log + body `"500"`.
- El `result` del action se pasa al componente como prop.

### Ruta dinámica

```tsx
// routes/items/[id]/index.tsx
import type { PageProps } from 'tinyary'

export default function Page({ data }: PageProps<{ item: { title: string } }>) {
  return <h1>{data.item.title}</h1>
}
```

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

```
loader (server) → data → payload (__tinyary_data__) → bootstrap → props
```

El componente recibe `data` como prop en SSR y en hidratación. Para seguir un
valor del servidor en el cliente, pasalo como prop desde el loader y usalo como
semilla de `useState`/`useSignal`.

## Estado e interactividad

Toda la página se hidrata. `island()` es un marcador (hoy no hace carga
selectiva).

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

Hooks desde `tinyary`: `useState`, `useEffect`, `useLayoutEffect`, `useMemo`,
`useRef`, `useCallback`, `useReducer`, `useContext`, `useId`.  
Signals: `signal`, `computed`, `effect`, `batch`, `untracked`, `useSignal`,
`useComputed`, `useSignalEffect`.

## AryKit (`tinyary/arykit`)

Subpath opt-in para estado compartido y server state.

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

- `createAry(valorInicial, opciones)` crea un átomo compartido entre islas.
- `useAryState(atom)` devuelve `[valor, setValor]`.
- `persist: 'clave'` guarda en `localStorage`.
- `useAryQuery` / `useAryMutation` para server state con caché, refetch e
  invalidación.
- `AryDevTools` panel flotante (inspeccionar, resetear, time travel).

La persistencia es SSR-safe: el primer render usa el valor inicial y el valor
guardado se aplica después de hidratar.

## Reglas de estado y SSR

- El estado no se serializa. Para seguir un valor del servidor, pasalo como
  prop desde el loader.
- No uses signals ni átomos de AryKit a nivel de módulo para estado por
  request: en SSR el módulo se comparte entre requests y filtra estado.
- No accedas a `document`/`window`/`localStorage` en el cuerpo del componente
  sin guardarlo en `useEffect`.
- No uses valores no determinísticos (`Math.random`, `Date.now`) en el cuerpo
  del componente sin guardarlos: rompen la hidratación.

## Server HTTP: Hono, sesión, cookies

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
`ctx.user` (`{ id, name } | null`). Hoy es un stub.

### Contexto disponible (`RequestCtx`)

`request`, `url`, `params`, `query`, `cookies` (Map), `user`.

### Endpoints JSON propios

```ts
// server.ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { app as pages } from 'virtual:tinyary/server-entry'

const app = new Hono()

app.get('/api/time', (c) =>
  c.json({ mensaje: 'ok', ahora: new Date().toISOString() }),
)

app.route('/', pages)   // las páginas van después de la API

export { app }
export function start() {
  const port = Number(process.env.PORT ?? 3000)
  return serve({ fetch: app.fetch, port }, () => {
    console.log(`tinyary en http://localhost:${port}`)
  })
}
```

## Virtual modules

El plugin expone cuatro módulos:

- `virtual:tinyary/routes` — manifest de rutas escaneadas.
- `virtual:tinyary/components` — componentes (top-level await).
- `virtual:tinyary/server-entry` — app Hono y arranque.
- `virtual:tinyary/client-entry` — entry del navegador que hidrata.

En el cliente, `tinyary/routes` se resuelve a una copia browser-safe de
`matchPattern` para no arrastrar `node:fs`.

## Superficie de imports

| Subpath | Qué exporta | Dónde se usa |
|---|---|---|
| `tinyary` | hooks, signals, `island`, tipos, `redirect`/`notFound`/`loader`/`action` | app y navegador |
| `tinyary/server` | `createServer`, `scanRoutes`, `matchRoute`, `renderSSR`, `injectData` | sólo servidor |
| `tinyary/vite` | plugin `tinyary()` | `vite.config.ts` |
| `tinyary/client` | `bootstrap`, `island` | generado por el plugin |
| `tinyary/client-routes` | `matchPattern` browser-safe | generado por el plugin |
| `tinyary/routes` | `scanRoutes`, `matchPattern`, `matchRoute` | Server-side (`src/routes.ts`, importa `node:fs`). **No** es generado por el plugin. |
| `tinyary/arykit` | átomos, queries, DevTools | opt-in |

La raíz de `tinyary` es browser-safe: no arrastra `node:fs`.

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
  build: { target: 'esnext' },  // top-level await
  ssr: { noExternal: true },    // tinyary publica TS fuente
})
```

- `appType: 'custom'` evita el fallback SPA de Vite.
- `resolve.dedupe: ['preact']` evita dos instancias de Preact.
- `optimizeDeps.include` con `preact/compat` es necesario para AryKit.

## CLI `create-tinyary`

```bash
node packages/create-tinyary/bin.js mi-app
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
| `fullstack` | Todo list fullstack: 3 rutas (home, nosotros, contacto), todos en el servidor. |

```bash
node .../bin.js mi-app --template global-state
node .../bin.js mi-app --template server-state
node .../bin.js mi-app --template fullstack
```

Sin `--template`, la CLI muestra un menú numerado y pregunta qué ejemplo querés.
Acepta número, nombre o alias (`minimal` → `bare`). Enter vacío usa `bare`.
Sin terminal interactiva (CI, pipes) no pregunta y usa el default.

Todos incluyen `index.html`, `vite.config.ts`, `server.ts`, `tinyary.config.ts`,
`styles/global.css` y un `AGENTS.md` en la raíz. El template `server-state` usa
un Hono propio en `server.ts` para registrar la API antes de montar las páginas.

El template apunta a este checkout con `link:<ruta absoluta>` (no publicado aún).

## Estructura del proyecto

```text
packages/tinyary/             núcleo, plugin de Vite y cliente
packages/tinyary/src/arykit/  átomos, server state y DevTools
packages/create-tinyary/      CLI y templates (bare, global-state, server-state, fullstack)
examples/hello/               ejemplo con Vite e isla de contador
scripts/smoke.mjs             validación end-to-end
```

## Tests, smoke y typecheck

```bash
pnpm test        # suite de Vitest
pnpm smoke       # levanta Vite y valida SSR, CSS, 404 y rutas
pnpm -r exec tsc --noEmit
```

El smoke arranca el ejemplo en un puerto libre, hace requests reales y apaga el
grupo de procesos al terminar.

## Tutorial: un todo list fullstack paso a paso

Esta sección recorre la construcción de un ejemplo como el template `fullstack`,
para que puedas experimentar y entender cada pieza. Vamos a crear una lista de
tareas cuyos datos viven en el servidor.

### 1. Arrancar desde `bare`

```bash
node packages/create-tinyary/bin.js mi-todo
cd mi-todo
pnpm install
pnpm dev
```

### 2. El store del servidor (`lib/todos.ts`)

Los todos viven en el servidor. Creamos un módulo con estado en memoria (en un
proyecto real sería una base de datos).

```ts
// lib/todos.ts
export type Todo = { id: number; text: string; done: boolean }

let nextId = 1
const todos: Todo[] = [
  { id: nextId++, text: 'Leer el README', done: false },
]

export function listTodos(): Todo[] {
  return todos.map((t) => ({ ...t }))
}

export function addTodo(text: string): Todo {
  const todo = { id: nextId++, text, done: false }
  todos.push(todo)
  return { ...todo }
}

export function toggleTodo(id: number): void {
  const t = todos.find((x) => x.id === id)
  if (t) t.done = !t.done
}

export function deleteTodo(id: number): void {
  const i = todos.findIndex((x) => x.id === id)
  if (i !== -1) todos.splice(i, 1)
}
```

> **Por qué en `lib/` y no en `routes/`**: `scanRoutes` sólo toma `index.tsx` y
> `layout.tsx`. Un archivo en `lib/` no se convierte en ruta, pero se importa
> normalmente desde las rutas.

### 3. La página home (`routes/index.tsx`)

```tsx
import { redirect } from 'tinyary'
import type { ActionCtx, PageProps, RequestCtx } from 'tinyary'
import { addTodo, deleteTodo, listTodos, toggleTodo } from '../lib/todos'

type HomeData = { todos: ReturnType<typeof listTodos> }

// 1) LOADER: corre en el servidor en cada GET (y tras el redirect del action).
export const loader = async (ctx: RequestCtx) => ({
  todos: listTodos(),
})

// 2) ACTION: corre en el servidor en cada POST. Muta el store y redirige
//    (patrón Post/Redirect/Get) para que el loader se re-ejecute.
export const action = async (ctx: ActionCtx) => {
  const intent = String(ctx.form.get('intent') ?? '')

  if (intent === 'add') {
    const text = String(ctx.form.get('text') ?? '').trim()
    if (text) addTodo(text)
  } else if (intent === 'toggle') {
    toggleTodo(Number(ctx.form.get('id')))
  } else if (intent === 'delete') {
    deleteTodo(Number(ctx.form.get('id')))
  }

  redirect('/')
}

// 3) COMPONENTE: se renderiza en SSR y se hidrata. Usa `data` del loader.
export default function Home({ data }: PageProps<HomeData>) {
  return (
    <section>
      <h1>Lista de tareas</h1>

      <form method="post" class="add-form">
        <input type="hidden" name="intent" value="add" />
        <input type="text" name="text" placeholder="¿Qué hay que hacer?" required />
        <button type="submit">Agregar</button>
      </form>

      {data.todos.length === 0 ? (
        <p>No hay tareas.</p>
      ) : (
        <ul>
          {data.todos.map((todo) => (
            <li key={todo.id} class={todo.done ? 'done' : ''}>
              <form method="post" class="inline">
                <input type="hidden" name="intent" value="toggle" />
                <input type="hidden" name="id" value={todo.id} />
                <button type="submit">{todo.done ? '✓' : '○'} {todo.text}</button>
              </form>
              <form method="post" class="inline">
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={todo.id} />
                <button type="submit">✕</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

### 4. Layout compartido (`routes/layout.tsx`)

```tsx
import type { ComponentChildren } from 'tinyary'

export default function RootLayout({ children }: { children?: ComponentChildren }) {
  return (
    <div>
      <nav>
        <a href="/">Inicio</a>
        <a href="/nosotros">Nosotros</a>
        <a href="/contacto">Contacto</a>
      </nav>
      <main>{children}</main>
    </div>
  )
}
```

### 5. Página informativa (`routes/nosotros/index.tsx`)

Sin loader ni action: sólo JSX renderizado en el servidor.

```tsx
export default function Nosotros() {
  return (
    <section>
      <h1>Nosotros</h1>
      <p>TinyAry es un mini framework fullstack.</p>
    </section>
  )
}
```

### 6. Formulario de contacto (`routes/contacto/index.tsx`)

Demuestra otro uso de `action`: validar y devolver un `result` sin redirigir.

```tsx
import type { ActionCtx, PageProps } from 'tinyary'

type ContactResult = { ok: true; name: string } | { error: string }

export const action = async (ctx: ActionCtx): Promise<ContactResult> => {
  const name = String(ctx.form.get('name') ?? '').trim()
  const message = String(ctx.form.get('message') ?? '').trim()
  if (!name) return { error: 'Ingresá tu nombre.' }
  if (!message) return { error: 'Ingresá un mensaje.' }
  return { ok: true, name }
}

export default function Contacto({ result }: PageProps<{}, ContactResult>) {
  return (
    <section>
      <h1>Contacto</h1>
      {result && 'ok' in result ? (
        <p>¡Gracias, {result.name}!</p>
      ) : (
        <form method="post">
          {result?.error && <p>{result.error}</p>}
          <input name="name" required />
          <textarea name="message" required />
          <button type="submit">Enviar</button>
        </form>
      )}
    </section>
  )
}
```

### 7. CSS (`styles/global.css`)

Vite sirve `styles/` como assets estáticos. Agregá estilos globales ahí.

### 8. Probar

```bash
pnpm dev
```

- `GET /` → SSR con la lista.
- Agregar/borrar/marcar → POST → redirect → lista actualizada (sin reload
  gracias a la navegación client-side).
- `/nosotros` y `/contacto` → navegación sin reload.
- El formulario de contacto muestra el mensaje de éxito sin recargar.

### 9. Experimentar

Ideas para probar sobre la marcha:

- Agregá un campo `priority` al todo y mostralo en la lista.
- Hacé que `/contacto` guarde los mensajes en el store (como los todos).
- Agregá una ruta `/items/[id]` que muestre un todo individual.
- Cambiá el store para que sea por usuario (keyeado por `ctx.user`).
- Probá qué pasa si sacás el `redirect('/')` del action (el framework re-renderiza
  con `result`).
- Probá desactivar JS en el navegador: los forms siguen funcionando con full reload.

## Navegación client-side

Los links `<a>` del mismo origen se interceptan automáticamente: en lugar de un
reload completo, se hace `fetch` del HTML, se extrae el payload
`#__tinyary_data__` y se re-renderiza la página con `render` de Preact. La URL
se actualiza con `history.pushState` y el botón atrás/adelante funciona.

- **Sin cambios en los componentes**: los `<a>` normales ya funcionan.
- **Los formularios POST también se envían sin reload** (fetch + re-render).
- **Loading state**: se agrega `data-navigating` al `<html>` y una barra de
  progreso mínima (`#tinyary-progress`).
- **Scroll**: va arriba en navegación nueva; restaura la posición con
  back/forward.
- **Fallback**: si el fetch falla o la ruta no matchea, se hace navegación
  normal (full reload).

Esto es la opción "fetch HTML" (reusa el SSR, sin endpoint de datos nuevo).

## Pendiente

- Cache conectado al `ctx` del request.
- Sesión real con cookies firmadas.
- Build de producción con manifest y assets hasheados.
- Hidratación selectiva (hoy `island()` es sólo un marcador).
- Publicar `tinyary` y `create-tinyary` en un registry.

## AGENTS.md

Los proyectos generados por la CLI incluyen un `AGENTS.md` en la raíz con la
guía del framework para agentes (estructura, reglas server/cliente, recetas,
gotchas). Cualquier agente que abra el proyecto puede leerlo para entender cómo
usarlo.
