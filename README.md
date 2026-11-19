# TinyAry

> English | [Español](./README.es.md)

Mini **fullstack** framework for personal projects. Preact + Vite + Hono +
TypeScript strict. Real SSR, client hydration, file-based router.

> Not a production framework. It exists to understand the full flow of a request:
> what runs on the server, what is sent to the browser, and what hydrates.

## Contents

- [In 30 seconds](#in-30-seconds)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Server vs. client (the part that confuses most)](#server-vs-client-the-part-that-confuses-most)
- [Request flow (SSR)](#request-flow-ssr)
- [Routes, loaders and actions](#routes-loaders-and-actions)
- [Passing data from server to client](#passing-data-from-server-to-client)
- [State and interactivity](#state-and-interactivity)
- [AryKit (`tinyary/arykit`)](#arykit-tinyaryarykit)
- [State rules and SSR](#state-rules-and-ssr)
- [Server HTTP: Hono, session, cookies](#server-http-hono-session-cookies)
- [Virtual modules](#virtual-modules)
- [Import surface](#import-surface)
- [Vite config (do not touch without reason)](#vite-config-do-not-touch-without-reason)
- [Testing your app](#testing-your-app)
- [CLI `create-tinyary`](#cli-create-tinyary)
- [Project structure](#project-structure)
- [Tests, smoke and typecheck](#tests-smoke-and-typecheck)
- [Tutorial: a fullstack todo list step by step](#tutorial-a-fullstack-todo-list-step-by-step)
- [Client-side navigation](#client-side-navigation)
- [Pending](#pending)
- [AGENTS.md](#agentsmd)

## In 30 seconds

- Every `routes/<name>/index.tsx` file is a page with its own URL.
- The page's `loader` runs on the **server** and returns data.
- The component is rendered to HTML on the server (SSR) and **hydrated** in the
  browser.
- The `action` runs on the server when a `POST` arrives (forms).
- `island()` marks a component as interactive (today the whole page hydrates
  the same way).

**Golden rule:** if it touches the filesystem, DB, cookies or secrets →
`loader`/`action` or a Hono endpoint. If it touches the DOM, user events or
local state → component or hook.

## Requirements

- Node 24+
- pnpm 10+

## Quick start

Run the included example:

```bash
pnpm install
pnpm --filter hello dev
# http://localhost:3000/
```

Or generate a new project:

```bash
node packages/create-tinyary/bin.js mi-app
cd mi-app
pnpm install
pnpm dev
```

Without `--template` the CLI asks which example you want (see [CLI](#cli-create-tinyary)).

## Server vs. client (the part that confuses most)

There is **one component tree** rendered twice (server and browser), but not
all code runs on both sides.

| Runs on the **server** | Runs in the **browser** | Runs on **both** |
|---|---|---|
| `loader` (per request) | `bootstrap` (hydration) | Component body (JSX) |
| `action` (on POST) | Hooks and signals | |
| `session` (`tinyary.config.ts`) | Event handlers (`onClick`, …) | |
| SSR render | | |
| Endpoints Hono | | |
| | | AryKit — module-level store, evaluated on both sides. In SSR the state is the initial one (it is not serialized); on the client it persists and hydrates. |

Practical consequences:

- **Do not put** `fetch`, `localStorage`, `document` or side effects in the
  component body without guarding them in `useEffect`.
- `useEffect` and event handlers are **ignored** on the server.
- Loaders **never** run in the browser: for client data use `useAryQuery` or a
  `fetch` inside `useEffect`.
- State (`useState`, `useSignal`) is **not serialized**. To carry a server
  value to the client, pass it as a prop from the loader.

## Request flow (SSR)

```
browser  →  Vite (dev)  →  Hono (server.ts)
                                  │
                                  ├─ matchRoute(path)        # which page/layout
                                  ├─ loadModule(page)        # dynamic import
                                  ├─ session(ctx)            # tinyary.config.ts
                                  ├─ action(ctx)             # only on POST
                                  ├─ loader(ctx)             # your data
                                  ├─ render(...)             # Preact tree
                                  ├─ renderSSR(tree)         # HTML string
                                  └─ injectData(shell, …)    # injects HTML + JSON
                                  │
browser  ←  full HTML with <script id="__tinyary_data__">
                                  │
                                  └─ bootstrap reads the JSON and hydrates
```

The `#__tinyary_data__` script is the bridge between server and client: it
carries `{ data, params, result }`.

## Routes, loaders and actions

### File conventions

- Only `index.tsx` defines pages.
- `[id]` becomes `:id` and arrives as `params.id`.
- A `layout.tsx` applies to the **descendants** of its folder, not to the
  `index.tsx` of that same folder.
- The root `layout.tsx` applies to every page.

### Minimal page

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

### Form (POST)

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

- `redirect(to)` → 303 response.
- `notFound()` → 404.
- Any other error → log + body `"500"`.
- The action's `result` is passed to the component as a prop.

### Dynamic route

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

## Passing data from server to client

```
loader (server) → data → payload (__tinyary_data__) → bootstrap → props
```

The component receives `data` as a prop in both SSR and hydration. To carry a
server value into the client, pass it as a prop from the loader and use it as
the seed for `useState`/`useSignal`.

## State and interactivity

The whole page hydrates. `island()` is a marker (no selective hydration today).

```tsx
import { island, useState, useSignal } from 'tinyary'

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount((v) => v + 1)}>{count}</button>
}

export default island(Counter)
```

Signals (no Babel transform needed):

```tsx
function Counter({ inicial }: { inicial: number }) {
  const count = useSignal(inicial)
  return <button onClick={() => count.value++}>{count}</button>
}
```

Hooks from `tinyary`: `useState`, `useEffect`, `useLayoutEffect`, `useMemo`,
`useRef`, `useCallback`, `useReducer`, `useContext`, `useId`.  
Signals: `signal`, `computed`, `effect`, `batch`, `untracked`, `useSignal`,
`useComputed`, `useSignalEffect`.

## AryKit (`tinyary/arykit`)

Opt-in subpath for shared state and server state.

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

- `createAry(initialValue, options)` creates an atom shared across islands.
- `useAryState(atom)` returns `[value, setValue]`.
- `persist: 'key'` stores in `localStorage`.
- `useAryQuery` / `useAryMutation` for server state with cache, refetch and
  invalidation.
- `AryDevTools` floating panel (inspect, reset, time travel).

Persistence is SSR-safe: the first render uses the initial value and the stored
value is applied after hydration.

## State rules and SSR

- State is not serialized. To carry a server value, pass it as a prop from the
  loader.
- Do not use signals or AryKit atoms at module level for per-request state: in
  SSR that module is shared across requests and leaks state. Use the loader for
  per-request data.
- Do not access `document`/`window`/`localStorage` in the component body without
  guarding in `useEffect`.
- Do not use non-deterministic values (`Math.random`, `Date.now`) in the
  component body without storing them: they break hydration.

## Server HTTP: Hono, session, cookies

The server is built with `createServer` (in `tinyary/server`). A project usually
has only:

```ts
// server.ts
export { app, start } from 'virtual:tinyary/server-entry'
```

### Session

`tinyary.config.ts` exports `session`:

```ts
import type { RequestCtx } from 'tinyary'

export const session = async (ctx: RequestCtx) => {
  const token = ctx.cookies.get('token')
  if (!token) return null
  return { id: '1', name: 'Ada' }
}
```

It runs once per request before the loader; the result lands in `ctx.user`
(`{ id, name } | null`). It is a stub today.

### Available context (`RequestCtx`)

`request`, `url`, `params`, `query`, `cookies` (Map), `user`.

### Custom JSON endpoints

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

The plugin exposes four modules:

- `virtual:tinyary/routes` — scanned route manifest.
- `virtual:tinyary/components` — components (top-level await).
- `virtual:tinyary/server-entry` — Hono app and startup.
- `virtual:tinyary/client-entry` — browser entry that hydrates.

On the client, `tinyary/routes` resolves to a browser-safe copy of
`matchPattern` so `node:fs` is not dragged into the bundle.

## Import surface

| Subpath | Exports | Where it is used |
|---|---|---|
| `tinyary` | hooks, signals, `island`, types, `redirect`/`notFound`/`loader`/`action` | app and browser |
| `tinyary/server` | `createServer`, `scanRoutes`, `matchRoute`, `renderSSR`, `injectData` | server only |
| `tinyary/vite` | plugin `tinyary()` | `vite.config.ts` |
| `tinyary/client` | `bootstrap`, `island` | generated by the plugin |
| `tinyary/client-routes` | `matchPattern` browser-safe | generated by the plugin |
| `tinyary/routes` | `scanRoutes`, `matchPattern`, `matchRoute` | Server-side (`src/routes.ts`, imports `node:fs`). **Not** generated by the plugin. |
| `tinyary/arykit` | atoms, queries, DevTools | opt-in |

The root of `tinyary` is browser-safe: it does not drag `node:fs`.

## Vite config (do not touch without reason)

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

- `appType: 'custom'` avoids Vite's SPA fallback.
- `resolve.dedupe: ['preact']` avoids two Preact instances.
- `optimizeDeps.include` with `preact/compat` is required for AryKit.

## Testing your app

TinyAry ships a `tinyary/testing` subpath so you can test routes and SSR with
Vitest without wiring Hono by hand:

```ts
// routes/index.test.ts
import { describe, it, expect } from 'vitest'
import { createTestApp, fetchApp } from 'tinyary/testing'

const routes = [{ path: '/', file: 'index.tsx', type: 'page', dir: '' }]

describe('home', () => {
  it('renderiza los datos del loader', async () => {
    const { app } = createTestApp({
      routes,
      modules: {
        'index.tsx': {
          default: () => null,
          loader: async () => ({ mensaje: 'hola' }),
        },
      },
    })
    const { status, text } = await fetchApp(app, '/')
    expect(status).toBe(200)
    expect(text).toContain('"mensaje":"hola"')
  })
})
```

- `createTestApp({ routes, modules })` builds an in-memory Hono app from a
  route manifest + module map (mocking `loadModule`).
- `fetchApp(app, path, init?)` fetches a path and returns
  `{ res, text, status }`.
- Vitest primitives (`describe`, `it`, `expect`, `vi`, …) come from `vitest`
  directly; `tinyary/testing` only provides the app-building helpers, so there
  is no module-identity problem in dev (where `tinyary` is linked).

Generated projects include `vitest` as a devDependency, so `pnpm test` works
out of the box once you add a `*.test.ts` file. Add a `test` script to
`package.json` if you want `pnpm test` to run it.

## CLI `create-tinyary`

```bash
node packages/create-tinyary/bin.js mi-app
cd mi-app
pnpm install
pnpm dev
```

### Templates

| Template | What it shows |
|---|---|
| `bare` (default) | `routes/index.tsx` with a loader and a hello world. No islands, no AryKit. |
| `global-state` | Two islands share an atom from `tinyary/arykit`; includes `AryDevTools`. |
| `server-state` | `useAryQuery` against `/api/time`, refetch, invalidation and `AryDevTools`. |
| `fullstack` | Fullstack todo list: 3 routes (home, nosotros, contacto), todos on the server. |

```bash
node .../bin.js mi-app --template global-state
node .../bin.js mi-app --template server-state
node .../bin.js mi-app --template fullstack
```

Without `--template` the CLI shows a numbered menu and asks which example you
want. It accepts a number, a name or an alias (`minimal` → `bare`). Empty
enter uses `bare`. With no interactive terminal (CI, pipes) it does not ask and
uses the default.

Every template includes `index.html`, `vite.config.ts`, `server.ts`,
`tinyary.config.ts`, `styles/global.css` and an `AGENTS.md` at the root. The
`server-state` template uses its own Hono in `server.ts` to register the API
before mounting the pages.

The template points at this checkout with `link:<absolute path>` (not published
yet).

## Project structure

```text
packages/tinyary/             core, Vite plugin and client
packages/tinyary/src/arykit/  atoms, server state and DevTools
packages/create-tinyary/      CLI and templates (bare, global-state, server-state, fullstack)
examples/hello/               example with Vite and a counter island
scripts/smoke.mjs             end-to-end validation
```

## Tests, smoke and typecheck

```bash
pnpm test        # suite de Vitest
pnpm smoke       # levanta Vite y valida SSR, CSS, 404 y rutas
pnpm -r exec tsc --noEmit
```

The smoke starts the example on an ephemeral port, makes real requests and shuts
down the process group when it finishes.

## Tutorial: a fullstack todo list step by step

This section walks through building an example like the `fullstack` template, so
you can experiment and understand each piece. We will build a task list whose
data lives on the server.

### 1. Start from `bare`

```bash
node packages/create-tinyary/bin.js mi-todo
cd mi-todo
pnpm install
pnpm dev
```

### 2. The server store (`lib/todos.ts`)

Todos live on the server. We create a module with in-memory state (in a real
project it would be a database).

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

> **Why `lib/` and not `routes/`**: `scanRoutes` only takes `index.tsx` and
> `layout.tsx`. A file in `lib/` does not become a route, but it is imported
> normally from routes.

### 3. The home page (`routes/index.tsx`)

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

### 4. Shared layout (`routes/layout.tsx`)

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

### 5. Informational page (`routes/nosotros/index.tsx`)

No loader or action: just JSX rendered on the server.

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

### 6. Contact form (`routes/contacto/index.tsx`)

Shows another use of `action`: validate and return a `result` without redirecting.

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

Vite serves `styles/` as static assets. Add global styles there.

### 8. Try it

```bash
pnpm dev
```

- `GET /` → SSR with the list.
- Add/toggle/delete → POST → redirect → list updated (no reload thanks to
  client-side navigation).
- `/nosotros` and `/contacto` → navigation without reload.
- The contact form shows the success message without reloading.

### 9. Experiment

Ideas to try on the fly:

- Add a `priority` field to the todo and show it in the list.
- Make `/contacto` store messages (like the todos).
- Add a `/items/[id]` route showing a single todo.
- Make the store per-user (keyed by `ctx.user`).
- Try removing `redirect('/')` from the action (the framework re-renders with
  `result`).
- Try disabling JS in the browser: forms still work with a full reload.

## Client-side navigation

Same-origin `<a>` links are intercepted automatically: instead of a full reload,
the HTML is fetched, the `#__tinyary_data__` payload is parsed, and the page is
re-rendered with Preact's `render`. The URL is updated with `history.pushState`
and back/forward works.

- **No component changes needed**: plain `<a>` already works.
- **POST forms are also submitted without reload** (fetch + re-render).
- **Loading state**: `data-navigating` is added to `<html>` plus a minimal
  progress bar (`#tinyary-progress`).
- **Scroll**: goes to the top on new navigation; restores position on
  back/forward.
- **Fallback**: if the fetch fails or the route does not match, a normal
  navigation (full reload) is performed.

This is the "fetch HTML" option (reuses SSR, no new data endpoint).

## Pending

- Cache wired to `ctx` (today `cache.ts` is not wired to the server).
- Real session with signed cookies.
- Production build with manifest and hashed assets.
- Selective hydration (today `island()` is only a marker).
- Publish `tinyary` and `create-tinyary` to a registry.

## AGENTS.md

Projects generated by the CLI include an `AGENTS.md` at the root with the
framework guide for agents (structure, server/client rules, recipes, gotchas).
Any agent opening the project can read it to understand how to use it.
