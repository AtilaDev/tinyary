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
    noExternal: true,
  },
})
