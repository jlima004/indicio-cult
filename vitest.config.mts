import path from 'node:path'

import { defineConfig } from 'vitest/config'

// Convenção: `tests/unit/` espelha `src/`.
//   src/app/page.tsx          → tests/unit/app/page.test.tsx
//   src/lib/env.ts            → tests/unit/lib/env.test.ts
//   src/components/brand/*.tsx → tests/unit/components/brand.test.tsx
// E2E (Playwright) vive em `tests/e2e/` e não é coletado aqui.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
    },
  },
})
