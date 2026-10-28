import path from 'node:path'

import { defineConfig } from 'vitest/config'

// Manual rehearsal only; explicit approval is checked before connecting.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['tests/integration/modules/nuvemshop/durability-supabase.test.ts'],
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
  },
})
