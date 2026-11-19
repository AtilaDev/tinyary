# Notas

Decisiones tomadas donde el prompt no cubría el caso, y cosas anotadas para no
meterlas en scope.

## Núcleo

- **La raíz de `tinyary` es browser-safe.** `createCache`, `scanRoutes`,
  `matchRoute` y `renderSSR` se exportan desde `tinyary/server`; la raíz
  reexporta hooks, signals, `island` y `matchPattern` (copia sin `node:fs`).
  Así `import { useState } from 'tinyary'` no arrastra builtins al navegador.
- **`preact` es peer dependency** de `tinyary`. La app lo instala y lo
  deduplica con `resolve.dedupe: ['preact']`; si no, el paquete con peer de
  `preact-render-to-string` puede resolverse como una segunda instancia.
- **`@preact/signals` es dependency de `tinyary`** y se reexporta desde la
  raíz. La app no necesita instalarlo ni importarlo directamente.

- **`nope.tsx` no es ruteable.** El spec pedía 4 pages + pattern `/nope`, y a la
  vez `matchRoute('/nope') === null`. Se eligió la convención estándar: sólo
  `index.tsx` define pages. Quedan 3 pages (`/`, `/listings`, `/listings/:id`).
- **`RouteEntry.file` es relativo a `routesDir`** (`listings/[id]/index.tsx`).
  Los virtual modules de Vite le prefijan `/routes/` para coincidir con las keys
  de `import.meta.glob`, sin arrastrar rutas absolutas al manifest.
- **Un layout cubre sólo a los descendientes de su carpeta**, no al `index.tsx`
  de esa misma carpeta (spec: `/listings` usa el layout raíz, no
  `listings/layout.tsx`).
- **`injectData(html, payload, rootId)`**: el HTML renderizado viaja en
  `payload.html` para respetar la firma de 3 argumentos. El `<script>` sólo
  serializa `{ data, params, result }`.
- **`createServer` acepta `shell`** (documento con `<div id="tinyary-root">`).
  No estaba en la lista de opciones, pero `injectData` necesita un HTML base y
  el server no puede leer archivos. Sin `shell` se usa un documento mínimo.
- **`render` devuelve sólo el árbol de la app** (layouts + page); el documento
  lo aporta `shell`. Así el server no importa Preact (sólo tipos).
- **Datos de loaders**: `data.page` + una entrada por layout con loader, keyed
  por archivo. Un layout sin loader no agrega claves al payload.
- **POST corre el action y después los loaders**, para renderizar con datos
  frescos. El módulo de la page se carga una sola vez por request.
- **`cache.get` no deduplica llamadas concurrentes**; el spec no lo pide.
- **500**: se loguea con `console.error` y el body es exactamente `"500"`.

## CLI

- **Cuatro templates**: `bare` (default), `global-state`, `server-state` y
  `fullstack`. `minimal` queda como alias de `bare`.
- **`fullstack`**: todo list con 3 rutas (home, nosotros, contacto), store de
  todos en memoria del servidor, formularios POST con action y PRG, y CSS
  simple. Demuestra el ciclo completo fullstack.
- **Sin `--template` el CLI pregunta**: muestra un menú numerado en terminal y
  acepta número, nombre o alias. Sin TTY (tests, CI, pipes) usa el default sin
  bloquear; la selección vive en `templates.js` y tiene tests unitarios.
- **`bare` no trae islas ni AryKit**: sólo `routes/index.tsx` con un loader y
  un hola mundo.
- **`global-state`**: un átomo de módulo compartido por dos islas y el
  `AryDevTools` visible.
- **`server-state`**: `useAryQuery` contra `/api/time`, con refetch e
  invalidación. El `server.ts` del template crea un Hono propio y monta las
  páginas con `app.route('/', pages)` para registrar la API antes del catch-all
  de `createServer`.
- **`AryDevTools` muestra átomos y queries**: la caché de `useAryQuery` se
  expone con `getQueryDebugState` y `subscribeToQueries`, y se puede invalidar
  desde el panel.
- **La hidratación sigue siendo de página completa**: `island()` es un
  marcador; no hay hidratación selectiva todavía.
- **El entry cliente importa `matchPattern` de `tinyary/client-routes`**, no de
  la raíz, para que un proyecto sin islas no cargue signals ni hooks.

## AryKit

- **Vive en `tinyary/arykit`, no en la raíz.** La raíz queda browser-safe y
  liviana; AryKit trae `preact/compat` y el DevTools, que no toda app necesita.
- **Port directo a Preact.** `useSyncExternalStore` sale de `preact/compat`;
  el resto son hooks de `preact/hooks`. No queda ninguna referencia a React.
- **Persistencia diferida un microtask.** `createAry` arranca siempre con el
  valor inicial y aplica el valor guardado después. Si leyera `localStorage`
  en el módulo, el primer render del cliente no coincidiría con el HTML del
  servidor y rompería la hidratación.
- **La hidratación no reescribe el storage.** `setDebugValue(..., true, true)`
  evita el write-back al leer el valor persistido.
- **Bugs corregidos del DevTools original**: había dos efectos de drag (uno
  actualizaba un estado que no se renderizaba), el listener de `mouseup` no se
  removía y las filas del historial usaban `Math.random()` como key, lo que las
  remontaba en cada render.
- **La carpeta `arykit/` de la raíz no se tocó.** Es un repo git aparte; la
  copia integrada es la de `packages/tinyary/src/arykit`.

## Navegación client-side (feat/client-navigation)

- **Opción A (fetch HTML)**: se interceptan los `<a>` del mismo origen, se hace
  `fetch` del HTML completo, se parsea `#__tinyary_data__` y se re-renderiza con
  `render` de Preact (desmontar + montar). Reusa el SSR, sin endpoint de datos
  nuevo.
- **`bootstrap` ahora pasa `result`** al render callback (tercer argumento), para
  que la hidratación inicial no pierda el `result` del action.
- **`render` de Preact** se importa en el client-entry para re-renderizar.
- **Helpers nuevos en `client-routes.ts`**: `matchRouteClient`, `parseDataScript`,
  `parseTitle`, `shouldInterceptLink`. Con tests unitarios.
- **Fallback graceful**: si el fetch falla o la ruta no matchea, se hace
  navegación normal (full reload).
- **Formularios POST siguen haciendo full reload** (más simple y robusto).
- **Loading state**: `data-navigating` en `<html>` + barra `#tinyary-progress`.
- **Scroll**: arriba en navegación nueva; restaura posición en back/forward.
- **No se rompió SSR**: smoke (16 checks) y 119 tests siguen verdes.

- Cache en `ctx` (hoy `cache.ts` no está cableado al server).
- Session real con cookies firmadas.
- Deduplicación de cache para requests concurrentes del mismo key.
- Logger configurable en `createServer`.
