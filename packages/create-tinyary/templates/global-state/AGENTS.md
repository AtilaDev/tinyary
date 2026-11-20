# AGENTS.md

## What is this project

A project generated with TinyAry, a micro fullstack framework (Preact + Vite +
Hono, strict TypeScript). It uses server-side rendering with client hydration
and a file-based router. This is not a production framework; it is meant for
learning and small personal projects. The full framework documentation lives in
the TinyAry repository's `README.md`.

## Project structure

```
.
├── index.html              # HTML shell with <div id="tinyary-root">
├── vite.config.ts          # Vite config (Preact + TinyAry plugin)
├── server.ts               # Re-exports the Hono app and start()
├── tinyary.config.ts       # Session hook (stub by default)
├── styles/global.css       # Global styles
├── routes/                 # File-based routes (only index.tsx and layout.tsx are routable)
│   ├── index.tsx           # Home page ("/")
│   ├── layout.tsx          # Root layout (wraps every page)
│   └── <name>/index.tsx    # Route "/<name>"
└── lib/                    # Server-only helpers (only in some templates)
```

Only `index.tsx` and `layout.tsx` are routable. Any other file name is just a
regular module imported by your routes. There are no tests in a generated
project by default.

## Golden rules

- If it touches the filesystem, DB, cookies or secrets → `loader` / `action` / Hono endpoint.
- If it touches the DOM, user events or local state → Preact component or hook.
- Never import server-only code (`node:fs`, DB clients) in client components.
- The client never sees the server's raw data; only what the `loader` returns via `PageProps`.

## Available scripts

- `pnpm dev`: start the dev server (Vite + Hono) at http://localhost:3000
- `pnpm test`: run unit tests
- `pnpm smoke`: run the smoke test
- `pnpm -r exec tsc --noEmit`: typecheck

## About TinyAry

This project uses TinyAry. For the full framework documentation, read the
`README.md` in the TinyAry repository. Do not try to reimplement the framework;
use its API. The framework code is frozen during development; use the documented
exports. Tests use Vitest; import primitives and helpers from `tinyary/testing`.
