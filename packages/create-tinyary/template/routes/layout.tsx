import type { ComponentChildren } from 'tinyary'

export default function Layout({ children }: { children?: ComponentChildren }) {
  return (
    <>
      <nav>
        <a href="/">Inicio</a>
      </nav>
      {children}
    </>
  )
}
