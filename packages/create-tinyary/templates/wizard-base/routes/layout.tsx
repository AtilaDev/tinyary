import type { ComponentChildren } from 'tinyary'

export default function Layout({ children }: { children?: ComponentChildren }) {
  return (
    <div class="shell">
      <header class="site-header">
        <a class="brand" href="/">{{name}}</a>
        <nav>
          <a href="/">Home</a>
          {/* NAV_LINKS */}
        </nav>
      </header>
      <main class="site-main">{children}</main>
      <footer class="site-footer">
        <small>Project generated with TinyAry.</small>
      </footer>
    </div>
  )
}
