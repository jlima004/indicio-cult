import 'server-only'

import { z } from 'zod'

import { parseEnv } from './parse'

export { publicEnv, publicSchema } from './public'

// Variáveis exclusivas do servidor. Nunca importar este módulo em código com
// 'use client' (o `server-only` acima faz o build falhar se acontecer).
export const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Sha do commit injetado pela imagem Docker (T13); "dev" fora dela.
  APP_VERSION: z.string().min(1).default('dev'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SENTRY_DSN: z.url().optional(),
  MAINTENANCE_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
})

export const env = parseEnv(serverSchema, process.env)
