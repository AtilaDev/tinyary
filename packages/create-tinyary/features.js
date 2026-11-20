// features.js — catálogo de features opcionales para el wizard.
// Cada feature es un fragmento autocontenido: archivos a copiar, dependencias
// a agregar, links de navegación y sección de AGENTS.md.

export const FEATURES = [
  {
    id: 'lowdb',
    label: 'Persistencia (LowDB)',
    description: 'Todo list persistente en db.json (sobrevive a reinicios)',
    deps: { lowdb: '^7.0.1' },
    navLinks: [{ href: '/todos', label: 'Todos' }],
    files: [
      { src: 'lib/db.ts', dest: 'lib/db.ts' },
      { src: 'routes/todos/index.tsx', dest: 'routes/todos/index.tsx' },
    ],
    agentsSection: `## LowDB

Persistencia en \`db.json\` con LowDB. Los todos sobreviven a reinicios del
servidor. Ver \`lib/db.ts\` y \`routes/todos/index.tsx\`.

- \`db.read()\` / \`db.write()\` son async (file I/O).
- El store se cachea en memoria del proceso (\`_db\`).
- Imports dinámicos de \`lowdb/node\` para no bundlear \`node:fs\` en el cliente.
`,
  },
  {
    id: 'iron-session',
    label: 'Auth (iron-session)',
    description: 'Sesiones firmadas en cookies, sin servicios externos',
    deps: { 'iron-session': '^8.0.4' },
    navLinks: [{ href: '/login', label: 'Login' }, { href: '/dashboard', label: 'Dashboard' }],
    files: [
      { src: 'lib/session.ts', dest: 'lib/session.ts' },
      { src: 'routes/login/index.tsx', dest: 'routes/login/index.tsx' },
      { src: 'routes/dashboard/index.tsx', dest: 'routes/dashboard/index.tsx' },
    ],
    agentsSection: `## iron-session

Sesiones firmadas en cookies (sin servicios externos). Ver \`lib/session.ts\`,
\`routes/login/index.tsx\` y \`routes/dashboard/index.tsx\`.

- \`getSession()\` lee la cookie firmada; \`setSession()\` la setea.
- No requiere store externo: la sesión vive en la cookie cifrada.
- Para producción, configurá \`IRON_SESSION_PASSWORD\` (mín. 32 chars).
`,
  },
  {
    id: 'blog',
    label: 'Blog (gray-matter + marked)',
    description: 'Posts en archivos .md con frontmatter',
    deps: { 'gray-matter': '^4.0.3', 'marked': '^15.0.0' },
    navLinks: [{ href: '/blog', label: 'Blog' }],
    files: [
      { src: 'lib/posts.ts', dest: 'lib/posts.ts' },
      { src: 'routes/blog/index.tsx', dest: 'routes/blog/index.tsx' },
      { src: 'routes/blog/[slug]/index.tsx', dest: 'routes/blog/[slug]/index.tsx' },
      { src: 'content/posts/hello.md', dest: 'content/posts/hello.md' },
    ],
    agentsSection: `## Blog (gray-matter + marked)

Posts en archivos Markdown con frontmatter YAML. Ver \`lib/posts.ts\`,
\`routes/blog/\` y \`content/posts/\`.

- \`listPosts()\` lee todos los .md de \`content/posts/\`.
- \`getPost(slug)\` parsea frontmatter + body con gray-matter.
- El body se renderiza con marked en el loader (HTML).
`,
  },
  {
    id: 'ws',
    label: 'Real-time (WebSocket)',
    description: 'Chat en tiempo real con ws',
    deps: { ws: '^8.18.0' },
    devDeps: { '@types/ws': '^8.5.13' },
    navLinks: [{ href: '/chat', label: 'Chat' }],
    files: [
      { src: 'routes/chat/index.tsx', dest: 'routes/chat/index.tsx' },
    ],
    serverSetup: `
// WebSocket: chat en tiempo real
import { WebSocketServer } from 'ws'
const wss = new WebSocketServer({ noServer: true })
// (ver routes/chat/index.tsx para el cliente)
`,
    agentsSection: `## WebSocket (ws)

Chat en tiempo real. Ver \`routes/chat/index.tsx\`.

- El servidor crea un \`WebSocketServer\` y lo monta en el upgrade del HTTP.
- El cliente se conecta con \`new WebSocket('ws://...')\`.
- Los mensajes se broadcastean a todos los clientes conectados.
`,
  },
  {
    id: 'cache',
    label: 'Cache (lru-cache)',
    description: 'Cache en memoria para loaders',
    deps: { 'lru-cache': '^11.0.2' },
    files: [
      { src: 'lib/cache.ts', dest: 'lib/cache.ts' },
    ],
    agentsSection: `## Cache (lru-cache)

Cache en memoria con LRU eviction. Ver \`lib/cache.ts\`.

- \`cache.get(key)\` / \`cache.set(key, value, { ttl })\`.
- Útil para cachear resultados de loaders costosos.
- El cache vive en memoria del proceso (se pierde al reiniciar).
`,
  },
  {
    id: 'nanoid',
    label: 'IDs únicos (nanoid)',
    description: 'Generador de IDs cortos y únicos',
    deps: { nanoid: '^5.0.9' },
    files: [
      { src: 'lib/id.ts', dest: 'lib/id.ts' },
    ],
    agentsSection: `## nanoid

Generador de IDs únicos y cortos. Ver \`lib/id.ts\`.

- \`nanoid()\` genera un ID de 21 caracteres.
- \`customAlphabet()\` para alfabetos personalizados.
- Sin dependencias, ~1KB.
`,
  },
  {
    id: 'valibot',
    label: 'Validación (valibot)',
    description: 'Validación de schemas (más liviano que zod)',
    deps: { valibot: '^1.0.0' },
    files: [
      { src: 'lib/validate.ts', dest: 'lib/validate.ts' },
    ],
    agentsSection: `## valibot

Validación de schemas. Ver \`lib/validate.ts\`.

- \`parse(schema, data)\` valida y retorna datos tipados.
- Más liviano que zod (~5KB vs ~15KB).
- Útil para validar forms en actions.
`,
  },
]
