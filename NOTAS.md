# Notas

Decisiones tomadas donde el prompt no cubría el caso, y cosas anotadas para no
meterlas en scope.

## Núcleo

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

## Pendiente / ideas fuera de scope

- Cache en `ctx` (hoy `cache.ts` no está cableado al server).
- Session real con cookies firmadas.
- Navegación cliente.
- Deduplicación de cache para requests concurrentes del mismo key.
- Logger configurable en `createServer`.
