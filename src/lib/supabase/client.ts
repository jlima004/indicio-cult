import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import { publicEnv } from '@/lib/env/public'

import type { Database } from './database.types'

// Cliente para componentes com 'use client'. Só depende de `publicEnv`: nunca
// importar `@/lib/env` (servidor) aqui. A sessão é lida/escrita em cookies pelo
// próprio @supabase/ssr, em sincronia com `server.ts` e `proxy.ts`.
export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
