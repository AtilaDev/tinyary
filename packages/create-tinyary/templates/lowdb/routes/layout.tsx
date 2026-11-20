// routes/layout.tsx
//
// Rol: layout RAÍZ. Se aplica a TODAS las páginas del proyecto (home, nosotros,
// contacto). Es el "marco" común: barra de navegación, contenedor y footer.
//
// Nota de TinyAry: un layout cubre a los *descendientes* de su carpeta, no al
// index.tsx de esa misma carpeta. Como este layout está en la raíz, cubre todo.
//
// `children` es el árbol de la página (y de layouts más internos, si existieran).

import type { ComponentChildren } from 'tinyary'

export default function RootLayout({ children }: { children?: ComponentChildren }) {
  return (
    <div class="shell">
      <header class="site-header">
        <a class="brand" href="/">TinyAry · Todos</a>
        <nav>
          <a href="/">Inicio</a>
          <a href="/nosotros">Nosotros</a>
          <a href="/contacto">Contacto</a>
        </nav>
      </header>

      <main class="site-main">{children}</main>

      <footer class="site-footer">
        <small>Los todos viven en el servidor. El cliente sólo los muestra.</small>
      </footer>
    </div>
  )
}
