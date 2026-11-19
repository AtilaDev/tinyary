import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/**/test/**/*.test.ts'],
    environment: 'node',
    // DECISIÓN: el commit de scaffold todavía no tiene tests; permitir que la
    // suite pase vacía evita un test de relleno. Con tests reales no aplica.
    passWithNoTests: true,
  },
})
