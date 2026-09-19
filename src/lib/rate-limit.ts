export type RateLimitOptions = {
  max: number
  windowMs: number
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  resetAt: number
}

export interface RateLimiter {
  limit(key: string, options: RateLimitOptions): RateLimitResult
}

type Window = {
  count: number
  resetAt: number
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, Window>()

  constructor(private readonly now: () => number = Date.now) {}

  limit(key: string, { max, windowMs }: RateLimitOptions): RateLimitResult {
    const now = this.now()

    for (const [storedKey, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(storedKey)
    }

    const window = this.windows.get(key) ?? { count: 0, resetAt: now + windowMs }
    window.count += 1
    this.windows.set(key, window)

    const remaining = Math.max(0, max - window.count)

    return {
      ok: window.count <= max,
      remaining,
      resetAt: window.resetAt,
    }
  }
}

export const memoryRateLimiter: RateLimiter = new MemoryRateLimiter()

export function clientIp(request: Request): string {
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()

  return forwardedIp || request.headers.get('x-real-ip')?.trim() || 'unknown'
}
