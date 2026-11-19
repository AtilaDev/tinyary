# TinyAry

Mini framework web fullstack con SSR para proyectos de prueba personales. Preact + Hono + TypeScript estricto, sin capas mágicas.

## Qué es

- Un router de archivos (`routes/index.tsx`, `routes/[id]/index.tsx`, `routes/layout.tsx`).
- SSR real: los loaders corren en el servidor y el HTML sale completo.
- Un server HTTP con GET/POST, redirects, 404/500 y sesión inyectable.
- Un cache en memoria con TTL y tags.
- Una API mínima: `loader`, `action`, `redirect`, `notFound`.

```ts
// routes/index.tsx
import { loader, type PageProps } from 'tinyary'

export const loadPage = loader(async () => ({ mensaje: 'Hola' }))

export default function Home({ data }: PageProps<{ mensaje: string }>) {
  return <h1>{data.mensaje}</h1>
}
```

## Qué no es

- No es Next.js ni un framework de producción.
- No hay RSC, Flight, resumability ni compilador propio.
- No hay base de datos ni autenticación real.
- No hay navegación cliente, islas ni plugin de Vite todavía (ver "Lo que falta").
- El cache existe pero todavía no está cableado en `ctx`.

## Requisitos

- Node 20+
- pnpm 10+

## Tests

```bash
pnpm install
pnpm test
```

Vitest, sin snapshots de HTML, sin red. Los tests del núcleo corren en Node puro.

## Correr el ejemplo

```bash
pnpm install
pnpm --filter hello dev
# http://localhost:3000
```

El ejemplo sirve `/` con SSR puro (sin Vite) y expone `/styles/global.css`.

## Smoke test

```bash
pnpm smoke
```

Levanta `examples/hello` en el puerto `3456`, hace requests reales y lo apaga.
No forma parte de `pnpm test`.

## Estructura

```
packages/tinyary/src/
  index.ts    loader, action, redirect, notFound
  types.ts    Params, RequestCtx, ActionCtx, PageProps
  routes.ts   scanRoutes, matchPattern, matchRoute
  render.ts   renderSSR, serializeData, injectData
  cache.ts    createCache (TTL + tags)
  server.ts   createServer (Hono)
examples/hello/
scripts/smoke.mjs
```

## Lo que falta

- **Plugin de Vite**: virtual modules para rutas, componentes y entradas de server/cliente, sin `server-entry.ts` a mano.
- **Hidratación e isla cliente**: `bootstrap` + `island()` para componentes interactivos.
- **CLI `create-tinyary`**: scaffold de un proyecto nuevo.
- **Navegación cliente**: links sin recarga y transiciones.
- **Cache en `ctx`**: exponer `ctx.cache` a loaders y actions.
- **Session real**: cookies firmadas / store, hoy `session` es una función inyectada que devuelve `null`.

## Decisiones

Ver [NOTAS.md](./NOTAS.md).
