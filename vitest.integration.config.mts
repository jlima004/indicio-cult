import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['tests/integration/modules/nuvemshop/durability-intake.test.ts'],
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
  },
})
