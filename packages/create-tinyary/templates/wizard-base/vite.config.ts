import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { tinyary } from 'tinyary/vite'

export default defineConfig({
  plugins: [preact(), tinyary()],
  appType: 'custom',
  resolve: {
    dedupe: ['preact', 'vitest'],
  },
  optimizeDeps: {
    include: ['preact', 'preact/hooks', 'preact/compat'],
  },
  server: {
    port: Number(process.env.PORT ?? 3000),
  },
  build: {
    target: 'esnext',
  },
  ssr: {
    // Sólo tinyary necesita transformación (publica TypeScript fuente).
    // El resto queda externo para que Node resuelva CJS con interop nativa
    // (ws, lowdb, etc. son CJS y rompen el module runner con noExternal: true).
    noExternal: ['tinyary'],
  },
})
