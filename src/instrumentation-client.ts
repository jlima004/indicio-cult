import * as Sentry from '@sentry/nextjs'

import { publicEnv, publicRelease } from '@/lib/env/public'
import { isDevelopment } from '@/lib/env/runtime'
import { sentryDataCollection } from '@/lib/sentry/privacy'

if (publicEnv.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: publicEnv.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    dataCollection: sentryDataCollection,
    environment: isDevelopment() ? 'development' : 'production',
    release: publicRelease,
  })
}

export function onRouterTransitionStart(
  url: string,
  navigationType: 'push' | 'replace' | 'traverse',
) {
  if (publicEnv.NEXT_PUBLIC_SENTRY_DSN) {
    const suffixStart = url.search(/[?#]/)
    const safeUrl = suffixStart < 0 ? url : url.slice(0, suffixStart)
    Sentry.captureRouterTransitionStart(safeUrl, navigationType)
  }
}
