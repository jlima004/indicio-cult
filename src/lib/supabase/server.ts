import 'server-only'

import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { publicEnv } from '@/lib/env'

import type { Database } from './database.types'

// Cliente para Server Components, Route Handlers e Server Actions, com a sessão
// do visitante lida dos cookies da requisição (anon key + RLS; nunca service
// role — para isso existe `admin.ts`).
//
// Com `cacheComponents: true`, `cookies()` só pode ser chamado em Route
// Handlers, Server Actions ou dentro de um limite `<Suspense>`; fora disso o
// build falha. Uma instância por requisição: não guardar em variável de módulo.
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Components não podem gravar cookies. Ignorar é seguro
            // porque o `proxy.ts` (T9) refresca a sessão e grava os cookies
            // na resposta antes de a página renderizar.
          }
        },
      },
    },
  )
}
