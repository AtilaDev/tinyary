# TinyAry — Guía de uso (wizard + framework)

> Este archivo es la guía práctica para usar TinyAry con el wizard y sus features.
> El README principal (`README.md`) cubre el framework en detalle; acá se cubre
> el flujo de creación de proyectos y el uso de cada feature.

## Crear un proyecto

### Wizard (recomendado)

```bash
node packages/create-tinyary/bin.js mi-app
```

Si tenés terminal interactiva, la CLI pregunta qué features querés agregar:

```
¿Qué features querés agregar? (números separados por coma, o "all"/"none")

  1. Persistencia (LowDB)     Todo list persistente en db.json
  2. Auth (iron-session)      Sesiones firmadas en cookies
  3. Blog (gray-matter + marked) Posts en archivos .md
  4. Real-time (WebSocket)    Chat en tiempo real
  5. Cache (lru-cache)        Cache en memoria para loaders
  6. IDs únicos (nanoid)      Generador de IDs cortos
  7. Validación (valibot)     Validación de schemas

Elegí (ej: 1,3,5) [none]:
```

También podés usar flags:

```bash
node packages/create-tinyary/bin.js mi-app --wizard          # wizard explícito
node packages/create-tinyary/bin.js mi-app --wizard -w       # alias
printf "all\n" | node packages/create-tinyary/bin.js mi-app --wizard  # todas las features (CI/pipes)
printf "1,3,5\n" | node packages/create-tinyary/bin.js mi-app --wizard  # features específicas
```

### Template tradicional

Si preferís un template completo pre-armado:

```bash
node packages/create-tinyary/bin.js mi-app --template lowdb
node packages/create-tinyary/bin.js mi-app --template fullstack
node packages/create-tinyary/bin.js mi-app --template bare
```

Templates disponibles: `bare`, `global-state`, `server-state`, `fullstack`, `lowdb`.

### Sin terminal interactiva (CI, pipes)

Sin TTY, la CLI usa el default (`bare`) sin preguntar. Para forzar features en CI,
usá `--template` o `--wizard` con input pipeado.

## Features disponibles

Cada feature es un fragmento autocontenido: archivos + dependencias + sección de
AGENTS.md. Se copian sobre la base `bare` y se conectan automáticamente.

### 1. Persistencia (LowDB)

**Dependencia:** `lowdb`
**Archivos:** `lib/db.ts`, `routes/todos/index.tsx`
**Qué muestra:** Todo list persistente en `db.json`. Los todos sobreviven a
reinicios del servidor.

```bash
# Uso en un loader:
import { listTodos } from '../lib/db'
export const loader = async () => ({ todos: await listTodos() })

# Uso en un action:
import { addTodo } from '../lib/db'
export const action = async ({ form }) => {
  await addTodo(String(form.get('text')))
  redirect('/')
}
```

### 2. Auth (iron-session)

**Dependencia:** `iron-session`
**Archivos:** `lib/session.ts`, `routes/login/index.tsx`, `routes/dashboard/index.tsx`
**Qué muestra:** Sesiones firmadas en cookies (sin servicios externos). Login con
usuario/contraseña, dashboard protegido, logout.

```bash
# En tinyary.config.ts:
import { unsealSession, COOKIE_NAME } from './lib/session'
export const session = async (ctx) => {
  const value = ctx.cookies.get(COOKIE_NAME)
  if (!value) return null
  const data = await unsealSession(value)
  return data?.userId ? { id: data.userId, name: data.username || 'user' } : null
}

# En un loader protegido:
export const loader = async (ctx) => {
  if (!ctx.user) redirect('/login')
  return { user: ctx.user }
}
```

Credenciales demo: `admin` / `tinyary`. Cambialas en `server.ts` (ruta `/auth/login`).

### 3. Blog (gray-matter + marked)

**Dependencias:** `gray-matter`, `marked`
**Archivos:** `lib/posts.ts`, `routes/blog/index.tsx`, `routes/blog/[slug]/index.tsx`, `content/posts/hello.md`
**Qué muestra:** Posts en archivos Markdown con frontmatter YAML. El body se
renderiza a HTML con `marked` en el loader.

```bash
# Agregar un post: crear content/posts/mi-post.md con frontmatter:
---
title: "Mi post"
date: "2026-01-01"
---
Contenido en Markdown...
```

### 4. Real-time (WebSocket)

**Dependencia:** `ws` (+ `@types/ws` en devDeps)
**Archivos:** `routes/chat/index.tsx`
**Qué muestra:** Chat en tiempo real con WebSocket. Los mensajes se broadcastean
a todos los clientes conectados.

### 5. Cache (lru-cache)

**Dependencia:** `lru-cache`
**Archivos:** `lib/cache.ts`
**Qué muestra:** Cache en memoria con LRU eviction para resultados de loaders.

```ts
import { getOrSet } from '../lib/cache'

export const loader = async () => ({
  data: await getOrSet('my-key', async () => {
    // operación costosa
    return fetchData()
  }, 60000) // TTL 1 minuto
})
```

### 6. IDs únicos (nanoid)

**Dependencia:** `nanoid`
**Archivos:** `lib/id.ts`
**Qué muestra:** Generador de IDs cortos y únicos.

```ts
import { nanoid, shortId } from '../lib/id'

const id = nanoid()        // 21 chars
const short = shortId()    // 10 chars
```

### 7. Validación (valibot)

**Dependencia:** `valibot`
**Archivos:** `lib/validate.ts`
**Qué muestra:** Validación de schemas (más liviano que zod).

```ts
import { v, contactSchema } from '../lib/validate'

export const action = async ({ form }) => {
  const result = v.safeParse(contactSchema, {
    name: form.get('name'),
    message: form.get('message'),
  })
  if (!result.success) return { error: result.issues[0].message }
  // result.output está tipado y validado
}
```

## Estructura del proyecto generado

```
mi-app/
├── index.html
├── vite.config.ts
├── server.ts              # Re-exports Hono app (o custom si hay features)
├── tinyary.config.ts      # Session hook
├── styles/global.css
├── routes/
│   ├── index.tsx          # Home
│   ├── layout.tsx         # Layout con nav (links de features)
│   └── <feature>/         # Rutas de cada feature
├── lib/                   # Helpers server-only (uno por feature)
├── content/               # Contenido (posts .md, etc.)
└── AGENTS.md              # Guía para agentes (secciones por feature)
```

## Golden rules del framework

1. Si toca filesystem, DB, cookies o secrets → `loader` / `action` / endpoint Hono.
2. Si toca el DOM, eventos o estado local → componente Preact o hook.
3. Nunca importar código server-only (`node:fs`, DB clients) en componentes del cliente.
4. El cliente nunca ve los datos crudos del servidor; solo lo que el `loader` devuelve via `PageProps`.

## Scripts disponibles

- `pnpm dev`: servidor de desarrollo (Vite + Hono) en http://localhost:3000
- `pnpm test`: tests unitarios (si hay)
- `pnpm -r exec tsc --noEmit`: typecheck

## Golden rule de TinyAry

> **Mantener todo tiny**: un archivo, una dependencia mínima, cero infraestructura.
> Si una feature necesita un servicio externo (DB en la nube, OAuth, etc.),
> probablemente no encaja con la filosofía del framework.

## Agregar un nuevo feature al wizard

1. Crear `packages/create-tinyary/features/<id>/` con los archivos.
2. Agregar la entrada en `packages/create-tinyary/features.js`.
3. El wizard automáticamente copia archivos, mergea deps, agrega nav links y sección AGENTS.md.

Cada feature debe ser **autocontenido**: se puede borrar la carpeta `lib/<feature>/` y `routes/<feature>/` sin romper el resto del proyecto.