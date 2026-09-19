import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { env, publicEnv } from '@/lib/env'

import type { Database } from './database.types'

// Cliente com service role: ignora RLS. Só em Route Handlers, Server Actions e
// jobs (webhooks Nuvemshop, backoffice) — nunca em componentes, nem em
// resposta direta a input do visitante sem validação. `server-only` faz o
// build falhar se este módulo for alcançado por código com 'use client'.
export function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    // Não há usuário: nada a persistir ou renovar.
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
