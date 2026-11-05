import 'server-only'

import { z } from 'zod'

import { parseEnv } from '@/lib/env/parse'
import { createIntakeLedger } from '@/modules/nuvemshop/server/durability'

import { createIntakePool } from './nuvemshop-intake-pool'

const nonempty = z.string().refine((value) => value.trim().length > 0)
export const nuvemshopIntakeSchema = z.object({
  NUVEMSHOP_INTAKE_HOST: nonempty,
  NUVEMSHOP_INTAKE_USER: nonempty,
  NUVEMSHOP_INTAKE_PASSWORD: nonempty,
  NUVEMSHOP_INTAKE_DATABASE: nonempty,
  NUVEMSHOP_INTAKE_PORT: z.literal('5432'),
  NUVEMSHOP_INTAKE_MODE: z.literal('session'),
  NUVEMSHOP_INTAKE_CA: nonempty.optional(),
  NUVEMSHOP_INTAKE_MAX_CONNECTIONS: z.enum(['1', '2', '3', '4', '5']).optional(),
})

let ledger: ReturnType<typeof createIntakeLedger> | undefined

/** Validates server-only configuration and creates the bounded pool on first use. */
export function getNuvemshopIntakeLedger(): ReturnType<typeof createIntakeLedger> {
  if (ledger) return ledger
  const config = parseEnv(nuvemshopIntakeSchema, process.env)
  const pool = createIntakePool({
    host: config.NUVEMSHOP_INTAKE_HOST,
    user: config.NUVEMSHOP_INTAKE_USER,
    password: config.NUVEMSHOP_INTAKE_PASSWORD,
    database: config.NUVEMSHOP_INTAKE_DATABASE,
    port: 5432,
    mode: 'session',
    ca: config.NUVEMSHOP_INTAKE_CA,
    maxConnections:
      config.NUVEMSHOP_INTAKE_MAX_CONNECTIONS === undefined
        ? undefined
        : Number(config.NUVEMSHOP_INTAKE_MAX_CONNECTIONS),
  })
  ledger = createIntakeLedger(pool)
  return ledger
}
