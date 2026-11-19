# TinyAry

Mini framework web fullstack para proyectos de prueba personales. Preact + Vite + Hono + TypeScript estricto, sin capas mágicas.

## Qué es

- Router de archivos: `routes/index.tsx`, `routes/<nombre>/index.tsx`, `routes/[id]/index.tsx` y `routes/layout.tsx`.
- SSR real: los loaders corren en el servidor y el HTML sale completo en la primera respuesta.
- Hidratación en el cliente con `bootstrap` e islas interactivas con `island()`.
- Server HTTP sobre Hono con GET/POST, `redirect`, `notFound`, layouts anidados y sesión inyectable.
- Plugin de Vite que genera los virtual modules, sirve SSR en dev y agrega el entry cliente al HTML.
- Ejemplo `hello` con una isla de contador.
- CLI `create-tinyary` que genera un proyecto desde el template.

### Una página

```tsx
// routes/index.tsx
import type { PageProps } from 'tinyary'

export const loader = async () => ({
  mensaje: 'Hola desde el servidor',
})

export default function Home({ data }: PageProps<{ mensaje: string }>) {
  return <h1>{data.mensaje}</h1>
}
```

### Una isla

```tsx
// routes/counter/counter.tsx
import { useState } from 'preact/hooks'
import { island } from 'tinyary/client'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button type="button" onClick={() => setCount((value) => value + 1)}>
      Valor: {count}
    </button>
  )
}

export default island(Counter)
```

La página se renderiza en el servidor y, al hidratar, el mismo componente pasa a ser interactivo.

## Qué no es

- No es un framework de producción.
- No hay RSC, Flight, resumability ni compilador propio.
- No hay navegación cliente: cada link hace un request completo.
- No hay base de datos, autenticación real ni sesión con cookies firmadas.
- No hay build de producción con manifest; el foco de esta etapa es el flujo de desarrollo con Vite.

## Requisitos

- Node 24+
- pnpm 10+

## Instalación

```bash
pnpm install
```

## Tests y smoke

```bash
pnpm test        # suite de Vitest (80 tests)
pnpm smoke       # levanta Vite y valida SSR, CSS, 404 y /counter
pnpm -r exec tsc --noEmit
```

El smoke arranca el ejemplo en un puerto libre, hace requests reales y apaga el grupo de procesos al terminar.

## Ejemplo `hello`

```bash
pnpm --filter hello dev
```

Por defecto queda en `http://localhost:3000/`. Se puede cambiar el puerto:

```bash
PORT=4000 pnpm --filter hello dev
```

Rutas del ejemplo:

- `GET /`: SSR puro del loader, con los datos inyectados en `#__tinyary_data__`.
- `GET /counter`: shell del servidor más la isla `Counter`, hidratada en el navegador.
- `GET /styles/global.css`: lo sirve Vite.

El servidor del ejemplo es sólo:

```ts
export { app, start } from 'virtual:tinyary/server-entry'
```

El plugin arma el server real con `createServer` y lo monta como middleware después de los assets de Vite.

## Convenciones de rutas

- Sólo `index.tsx` define páginas.
- `[id]` se convierte en `:id` y llega como `params.id`.
- Un `layout.tsx` aplica a los descendientes de su carpeta, no al `index.tsx` de esa misma carpeta.
- El `layout.tsx` de la raíz aplica a todas las páginas.
- El loader se exporta como `loader`; el action de un POST, como `action`.
- Los tipos de Preact que necesita una app (`ComponentChildren`) se reexportan desde `tinyary`. El runtime y los hooks siguen viniendo de `preact`, para no duplicar la instancia.

## Virtual modules

El plugin expone cuatro módulos:

- `virtual:tinyary/routes`: manifest de rutas escaneadas.
- `virtual:tinyary/components`: componentes cargados con top-level await.
- `virtual:tinyary/server-entry`: app Hono y arranque.
- `virtual:tinyary/client-entry`: entry del navegador que hidrata la página actual.

En el cliente, `tinyary/routes` se resuelve a una copia browser-safe de `matchPattern` para no arrastrar `node:fs` al bundle.

## CLI `create-tinyary`

Desde el directorio donde querés crear el proyecto:

```bash
node /ruta/a/tinyary/packages/create-tinyary/bin.js demo
cd demo
pnpm install
pnpm dev
```

Genera un proyecto con `index.html`, `vite.config.ts`, `server.ts`, `tinyary.config.ts`, layout y página inicial.

El template apunta a este checkout con `link:<ruta absoluta>`, porque todavía no está publicado en un registry. Publicarlo queda fuera de esta etapa.

## Estructura

```text
packages/tinyary/          núcleo, plugin de Vite y cliente
packages/create-tinyary/   CLI y template
examples/hello/            ejemplo con Vite e isla de contador
scripts/smoke.mjs          validación end-to-end
```

## Pendiente

- Navegación cliente sin recarga.
- Cache conectado al `ctx` del request.
- Sesión real con cookies firmadas.
- Build de producción con manifest y assets hasheados.
- Publicar `tinyary` y `create-tinyary` en un registry.
