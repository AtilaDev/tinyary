# AGENTS.md

## What is this project

A project generated with TinyAry (wizard mode), a mini fullstack framework
(Preact + Vite + Hono, strict TypeScript). It uses server-side rendering with
client hydration and a file-based router. This is not a production framework;
it is meant for learning and small personal projects.

## Project structure

```
.
├── index.html
├── vite.config.ts
├── server.ts
├── tinyary.config.ts
├── styles/global.css
├── routes/
│   ├── index.tsx
│   ├── layout.tsx
│   └── <name>/index.tsx
└── lib/                    # Server-only helpers (one per feature)
```

## Features selected

<!-- FEATURES -->

## Golden rules

- If it touches the filesystem, DB, cookies or secrets → `loader` / `action` / Hono endpoint.
- If it touches the DOM, user events or local state → Preact component or hook.
- Never import server-only code (`node:fs`, DB clients) in client components.

## Available scripts

- `pnpm dev`: start the dev server at http://localhost:3000
- `pnpm test`: run unit tests
- `pnpm -r exec tsc --noEmit`: typecheck

## About TinyAry

This project uses TinyAry. For the full framework documentation, read the
`README.md` in the TinyAry repository.
