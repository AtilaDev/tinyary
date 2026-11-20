// features.js — catalog of optional features for the wizard.
// Each feature is a self-contained fragment: files to copy, dependencies
// to add, navigation links, and AGENTS.md section.

export const FEATURES = [
  {
    id: 'lowdb',
    label: 'Persistence (LowDB)',
    description: 'Persistent todo list in db.json (survives server restarts)',
    deps: { lowdb: '^7.0.1' },
    navLinks: [{ href: '/todos', label: 'Todos' }],
    files: [
      { src: 'lib/db.ts', dest: 'lib/db.ts' },
      { src: 'routes/todos/index.tsx', dest: 'routes/todos/index.tsx' },
    ],
    agentsSection: `## LowDB

Persistence in \`db.json\` with LowDB. Todos survive server restarts.
See \`lib/db.ts\` and \`routes/todos/index.tsx\`.

- \`db.read()\` / \`db.write()\` are async (file I/O).
- The store is cached in process memory (\`_db\`).
- Dynamic imports of \`lowdb/node\` to avoid bundling \`node:fs\` in the client.
`,
  },
  {
    id: 'iron-session',
    label: 'Auth (iron-session)',
    description: 'Signed sessions in cookies, no external services',
    deps: { 'iron-session': '^8.0.4', 'valibot': '^1.0.0' },
    navLinks: [{ href: '/login', label: 'Login' }, { href: '/dashboard', label: 'Dashboard' }],
    files: [
      { src: 'lib/session.ts', dest: 'lib/session.ts' },
      { src: 'routes/login/index.tsx', dest: 'routes/login/index.tsx' },
      { src: 'routes/dashboard/index.tsx', dest: 'routes/dashboard/index.tsx' },
    ],
    agentsSection: `## iron-session

Signed sessions in cookies (no external services). See \`lib/session.ts\`,
\`routes/login/index.tsx\` and \`routes/dashboard/index.tsx\`.

- \`sealSession()\` encrypts session data into a cookie value.
- \`unsealSession()\` decrypts it back.
- No external store needed: the session lives in the encrypted cookie.
- For production, set \`IRON_SESSION_PASSWORD\` (min. 32 chars).
`,
  },
  {
    id: 'blog',
    label: 'Blog (gray-matter + marked)',
    description: 'Posts in .md files with frontmatter',
    deps: { 'gray-matter': '^4.0.3', 'marked': '^15.0.0' },
    navLinks: [{ href: '/blog', label: 'Blog' }],
    files: [
      { src: 'lib/posts.ts', dest: 'lib/posts.ts' },
      { src: 'routes/blog/index.tsx', dest: 'routes/blog/index.tsx' },
      { src: 'routes/blog/[slug]/index.tsx', dest: 'routes/blog/[slug]/index.tsx' },
      { src: 'content/posts/hello.md', dest: 'content/posts/hello.md' },
    ],
    agentsSection: `## Blog (gray-matter + marked)

Posts in Markdown files with YAML frontmatter. See \`lib/posts.ts\`,
\`routes/blog/\` and \`content/posts/\`.

- \`listPosts()\` reads all .md files from \`content/posts/\`.
- \`getPost(slug)\` parses frontmatter + body with gray-matter.
- The body is rendered to HTML with marked in the loader.
`,
  },
  {
    id: 'ws',
    label: 'Real-time (WebSocket)',
    description: 'Real-time chat with ws',
    deps: { ws: '^8.18.0' },
    devDeps: { '@types/ws': '^8.5.13' },
    navLinks: [{ href: '/chat', label: 'Chat' }],
    files: [
      { src: 'routes/chat/index.tsx', dest: 'routes/chat/index.tsx' },
    ],
    serverSetup: `
// WebSocket: real-time chat
import { WebSocketServer } from 'ws'
const wss = new WebSocketServer({ noServer: true })
// (see routes/chat/index.tsx for the client)
`,
    agentsSection: `## WebSocket (ws)

Real-time chat. See \`routes/chat/index.tsx\`.

- The server creates a \`WebSocketServer\` and mounts it on the HTTP upgrade.
- The client connects with \`new WebSocket('ws://...')\`.
- Messages are broadcast to all connected clients.
`,
  },
  {
    id: 'cache',
    label: 'Cache (lru-cache)',
    description: 'In-memory cache for loaders',
    deps: { 'lru-cache': '^11.0.2' },
    files: [
      { src: 'lib/cache.ts', dest: 'lib/cache.ts' },
    ],
    agentsSection: `## Cache (lru-cache)

In-memory cache with LRU eviction. See \`lib/cache.ts\`.

- \`cache.get(key)\` / \`cache.set(key, value, { ttl })\`.
- Useful for caching expensive loader results.
- The cache lives in process memory (lost on restart).
`,
  },
  {
    id: 'nanoid',
    label: 'Unique IDs (nanoid)',
    description: 'Short unique ID generator',
    deps: { nanoid: '^5.0.9' },
    files: [
      { src: 'lib/id.ts', dest: 'lib/id.ts' },
    ],
    agentsSection: `## nanoid

Short unique ID generator. See \`lib/id.ts\`.

- \`nanoid()\` generates a 21-char ID.
- \`customAlphabet()\` for custom alphabets.
- No dependencies, ~1KB.
`,
  },
  {
    id: 'valibot',
    label: 'Validation (valibot)',
    description: 'Schema validation (lighter than zod)',
    deps: { valibot: '^1.0.0' },
    files: [
      { src: 'lib/validate.ts', dest: 'lib/validate.ts' },
    ],
    agentsSection: `## valibot

Schema validation. See \`lib/validate.ts\`.

- \`parse(schema, data)\` validates and returns typed data.
- Lighter than zod (~5KB vs ~15KB).
- Useful for validating forms in actions.
`,
  },
]
