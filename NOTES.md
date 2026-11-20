# Notes

Decisions made where the prompt did not cover the case, and things noted so
they do not creep into scope.

## Core

- **The root of `tinyary` is browser-safe.** `createCache`, `scanRoutes`,
  `matchRoute` and `renderSSR` are exported from `tinyary/server`; the root
  re-exports hooks, signals, `island` and `matchPattern` (a copy without
  `node:fs`). This way `import { useState } from 'tinyary'` does not drag
  builtins into the browser.
- **`preact` is a peer dependency** of `tinyary`. The app installs it and
  dedupes it with `resolve.dedupe: ['preact']`; otherwise the package with the
  `preact-render-to-string` peer may resolve as a second instance.
- **`@preact/signals` is a dependency of `tinyary`** and is re-exported from
  the root. The app does not need to install or import it directly.
- **`nope.tsx` is not routable.** The spec asked for 4 pages + a `/nope`
  pattern, and at the same time `matchRoute('/nope') === null`. The standard
  convention won: only `index.tsx` defines pages. There are 3 pages (`/`,
  `/listings`, `/listings/:id`).
- **`RouteEntry.file` is relative to `routesDir`** (`listings/[id]/index.tsx`).
  The Vite virtual modules prefix it with `/routes/` to match the
  `import.meta.glob` keys, so the manifest is serializable without depending on
  the project's absolute path on disk.
- **A layout covers only the descendants of its folder**, not the `index.tsx`
  of that same folder (spec: `/listings` uses the root layout, not
  `listings/layout.tsx`).
- **`injectData(html, payload, rootId)`**: the rendered HTML travels in
  `payload.html` to respect the 3-argument signature. The `<script>` only
  serializes `{ data, params, result }`.
- **`createServer` accepts `shell`** (a document with
  `<div id="tinyary-root">`). It was not in the list of options, but
  `injectData` needs a base HTML and the server cannot read files. Without
  `shell` a minimal document is used.
- **`render` returns only the app tree** (layouts + page); the document comes
  from `shell`. This way the server does not import Preact (only types).
- **Loader data**: `data.page` plus one entry per layout with a loader, keyed by
  file. A layout without a loader adds no keys to the hydration payload.
- **POST runs the action and then the loaders**, to render with fresh data. The
  page module is loaded once per request.
- **`cache.get` does not deduplicate concurrent calls**; the spec does not
  require it.
- **500**: logged with `console.error` and the body is exactly `"500"`.

## CLI

- **Five templates**: `bare` (default), `global-state`, `server-state`,
  `fullstack` and `lowdb`. `minimal` remains an alias of `bare` to not break
  the previous command.
- **Without `--template` the CLI asks**: it shows a numbered menu in the
  terminal and accepts a number, a name or an alias. Without a TTY (tests, CI,
  pipes) it uses the default without blocking; selection lives in
  `templates.js` and has unit tests.
- **`bare` ships no islands or AryKit**: only `routes/index.tsx` with a loader
  and a hello world.
- **`global-state`**: a module atom shared by two islands and the visible
  `AryDevTools`.
- **`server-state`**: `useAryQuery` against `/api/time`, with refetch and
  invalidation. The template's `server.ts` creates its own Hono and mounts the
  pages with `app.route('/', pages)` to register the API before the
  `createServer` catch-all.
- **`fullstack`**: todo list with 3 routes (home, nosotros, contacto), a
  server-side todo store, POST forms with action and PRG, and simple CSS.
  Demonstrates the full fullstack cycle.
- **`AryDevTools` shows atoms and queries**: the `useAryQuery` cache is exposed
  through `getQueryDebugState` and `subscribeToQueries`, and can be invalidated
  from the panel.
- **Hydration is still full-page**: `island()` is a marker; there is no
  selective hydration yet.
- **The client entry imports `matchPattern` from `tinyary/client-routes`**, not
  from the root, so a project without islands does not load signals or hooks.

## AryKit

- **Lives in `tinyary/arykit`, not in the root.** The root stays browser-safe
  and light; AryKit brings `preact/compat` and the DevTools, which not every
  app needs.
- **Direct port to Preact.** `useSyncExternalStore` comes from `preact/compat`;
  the rest are hooks from `preact/hooks`. No reference to React remains.
- **Persistence deferred by one microtask.** `createAry` always starts with the
  initial value and applies the stored value afterwards. If it read
  `localStorage` in the module, the client's first render would not match the
  server HTML and hydration would break.
- **Hydration does not rewrite storage.** `setDebugValue(..., true, true)`
  avoids the write-back when reading the persisted value.
- **Bugs fixed in the original DevTools**: there were two drag effects (one
  updated state that was never rendered), the `mouseup` listener was never
  removed, and the history rows used `Math.random()` as key, which remounted
  them on every render.
- **The root `arykit/` folder was not touched.** It is a separate git repo; the
  integrated copy is the one in `packages/tinyary/src/arykit`.

## Client-side navigation (feat/client-navigation)

- **Option A (fetch HTML)**: same-origin `<a>` clicks are intercepted, the
  full HTML is fetched, `#__tinyary_data__` is parsed and the page is
  re-rendered with Preact's `render` (unmount + mount). It reuses SSR, with no
  new data endpoint.
- **`bootstrap` now passes `result`** to the render callback (third argument),
  so initial hydration does not lose the action's `result`.
- **Preact's `render`** is imported in the client entry to re-render.
- **New helpers in `client-routes.ts`**: `matchRouteClient`, `parseDataScript`,
  `parseTitle`, `shouldInterceptLink`. With unit tests.
- **Graceful fallback**: if the fetch fails or the route does not match, a
  normal navigation (full reload) is performed.
- **POST forms are also submitted without reload** (fetch + re-render); they
  previously did a full reload.
- **Loading state**: `data-navigating` on `<html>` plus the `#tinyary-progress`
  bar.
- **Scroll**: top on new navigation; restores position on back/forward.
- **SSR not broken**: smoke (16 checks) and 119 tests still green.

## Pending / out of scope

- Cache in `ctx` (today `cache.ts` is not wired to the server).
- Real session with signed cookies.
- Client-side navigation without reload — done.
- Deduplication of the cache for concurrent requests with the same key.
- Configurable logger in `createServer`.
- Production build with manifest and hashed assets.
- Selective hydration (today `island()` is only a marker).
- Publishing `tinyary` and `create-tinyary` to a registry.
