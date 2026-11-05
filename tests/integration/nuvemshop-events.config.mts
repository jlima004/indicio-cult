import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': path.resolve('src') } },
  test: {
    environment: 'node',
    include: ['tests/integration/nuvemshop-events.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
})
