import { connection } from 'next/server'

import { json, problem } from '@/lib/http'
import { clientIp, memoryRateLimiter } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const RATE_LIMIT = { max: 60, windowMs: 60_000 }
const SUPABASE_TIMEOUT_MS = 2_000
const HEALTH_PROBE_RELATION = '__foundation_health_probe__'

async function isSupabaseHealthy(): Promise<boolean> {
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    const probe = (async () => {
      const supabase = await createClient()

      return supabase
        .from(HEALTH_PROBE_RELATION as never)
        .select('*', { head: true, count: 'exact' })
        .abortSignal(controller.signal)
    })()
    const expired = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort()
        reject(new Error('Supabase health probe timed out'))
      }, SUPABASE_TIMEOUT_MS)
    })
    const { error } = await Promise.race([probe, expired])

    // O schema public nasce vazio. PGRST205 confirma que o Data API alcançou
    // o schema cache e que a relação sentinela, intencionalmente, não existe.
    return error === null || error.code === 'PGRST205'
  } catch {
    return false
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}

export async function GET(request: Request): Promise<Response> {
  await connection()
  // O build coleta a configuração da rota sem segredos de servidor.
  // A validação de env permanece no runtime, após a fronteira dinâmica.
  const { env } = await import('@/lib/env')

  const rateLimit = memoryRateLimiter.limit(clientIp(request), RATE_LIMIT)

  if (!rateLimit.ok) {
    const response = problem(429, 'Too Many Requests')
    response.headers.set('cache-control', 'no-store')
    response.headers.set(
      'retry-after',
      String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1_000))),
    )
    return response
  }

  const headers = { 'cache-control': 'no-store' }

  if (!(await isSupabaseHealthy())) {
    return json({ status: 'degraded', supabase: 'error' }, { status: 503, headers })
  }

  return json({ status: 'ok', version: env.APP_VERSION, supabase: 'ok' }, { status: 200, headers })
}
