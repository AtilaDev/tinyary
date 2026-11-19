import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { tinyary } from 'tinyary/vite'

export default defineConfig({
  plugins: [preact(), tinyary()],
  // El plugin responde las páginas con SSR; no debe entrar el fallback SPA.
  appType: 'custom',
  // Una sola copia de Preact: el paquete con peer de render-to-string puede
  // resolverse como instancia distinta y romper la hidratación.
  resolve: {
    dedupe: ['preact'],
  },
  optimizeDeps: {
    include: ['preact', 'preact/hooks', '@preact/signals'],
  },
  server: {
    port: Number(process.env.PORT ?? 3000),
  },
  build: {
    // virtual:tinyary/components usa top-level await.
    target: 'esnext',
  },
  ssr: {
    // tinyary publica TypeScript fuente para el workspace.
    noExternal: true,
  },
})
