#!/usr/bin/env node
// Configuration is an explicit local module: export poolConfig and processor.
// Run under --conditions=react-server for the server-only boundary.
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
async function main() {
  const configPath = process.argv[2]
  if (!configPath || process.argv.length !== 3)
    throw new Error('Provide one configuration module path')
  const config = await import(pathToFileURL(resolve(configPath)).href)
  if (typeof config.processor !== 'function' || !config.poolConfig)
    throw new Error('Configuration requires poolConfig and processor')
  const { createIntakePool } = require('../.worker-build/lib/server/nuvemshop-intake-pool.js')
  const {
    createRecoveryStore,
  } = require('../.worker-build/modules/nuvemshop/server/durability/recovery-store.js')
  const {
    createRecoveryWorker,
  } = require('../.worker-build/modules/nuvemshop/server/durability/worker.js')
  const pool = createIntakePool(config.poolConfig)
  const controller = new AbortController()
  const stop = () => controller.abort()
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  let running = false
  try {
    const worker = createRecoveryWorker(createRecoveryStore(pool), config.processor, config.options)
    running = true
    await worker.run(controller.signal)
  } finally {
    if (!running) await pool.close()
    process.removeListener('SIGINT', stop)
    process.removeListener('SIGTERM', stop)
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    console.error('Nuvemshop worker stopped with an error')
    process.exitCode = 1
  })
}
