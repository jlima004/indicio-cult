import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { env, publicEnv } from '@/lib/env'
import { loadMaintenanceHtml } from '@/lib/proxy/maintenance'
import { decideProxyAction, isHealthPath } from '@/lib/proxy/rules'
import type { Database } from '@/lib/supabase/database.types'

export const RETRY_AFTER_SECONDS = 300

type PendingCookie = {
  name: string
  value: string
  options: CookieOptions
}

function applySupabaseResponseState(
  response: NextResponse,
  cookies: PendingCookie[],
  headers: Record<string, string>,
): NextResponse {
  for (const { name, value, options } of cookies) {
    response.cookies.set(name, value, options)
  }

  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value)
  }

  return response
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  if (
    decideProxyAction({
      pathname,
      maintenanceMode: env.MAINTENANCE_MODE,
      hasVerifiedClaims: false,
    }) === 'maintenance'
  ) {
    const response = new NextResponse(await loadMaintenanceHtml(), {
      status: 503,
    })
    response.headers.set('Content-Type', 'text/html; charset=utf-8')
    response.headers.set('Retry-After', String(RETRY_AFTER_SECONDS))
    return response
  }

  // O health é operacional e não pode depender de uma sessão de usuário.
  if (isHealthPath(pathname)) return NextResponse.next()

  let response = NextResponse.next({ request: { headers: request.headers } })
  const pendingCookies: PendingCookie[] = []
  const pendingHeaders: Record<string, string> = {}

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          pendingCookies.push(...cookiesToSet)
          Object.assign(pendingHeaders, headers)

          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }

          response = applySupabaseResponseState(
            NextResponse.next({ request: { headers: request.headers } }),
            pendingCookies,
            pendingHeaders,
          )
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()
  const hasVerifiedClaims = typeof data?.claims?.sub === 'string'
  const action = decideProxyAction({
    pathname,
    maintenanceMode: false,
    hasVerifiedClaims,
  })

  if (action === 'redirect') {
    // TODO(identity): substituir este gate temporário pelo fluxo de login e,
    // para /admin, pela autorização por papel do módulo responsável.
    return applySupabaseResponseState(
      NextResponse.redirect(new URL('/', request.url), { status: 302 }),
      pendingCookies,
      pendingHeaders,
    )
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static(?:/|$)|_next/image(?:/|$)|favicon\\.ico$).*)'],
}
