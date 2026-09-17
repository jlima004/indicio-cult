import { z } from 'zod'

import { parseEnv } from './parse'

// Variáveis que podem ir ao navegador (prefixo NEXT_PUBLIC_). Este módulo NÃO
// importa `server-only`: componentes cliente usam `@/lib/env/public`.
export const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
})

// As referências literais a `process.env.NEXT_PUBLIC_*` são obrigatórias: o
// Next substitui cada uma pelo valor em tempo de build no bundle do navegador;
// `process.env` como objeto não é inlinado.
export const publicEnv = parseEnv(publicSchema, {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
})
