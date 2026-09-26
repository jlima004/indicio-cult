import * as Sentry from '@sentry/nextjs'

import { isDevelopment } from '@/lib/env/runtime'
import { sentryDataCollection } from '@/lib/sentry/privacy'

// Não importar `@/lib/env/public`. Esse módulo avalia Zod no carregamento e
// entraria no chunk inicial de toda página. O layout já valida NEXT_PUBLIC_*.
// As referências literais a `process.env.NEXT_PUBLIC_*` são o que o Next inline.
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const release = process.env.NEXT_PUBLIC_APP_VERSION || 'dev'

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.1,
    dataCollection: sentryDataCollection,
    environment: isDevelopment() ? 'development' : 'production',
    release,
  })
}

export function onRouterTransitionStart(
  url: string,
  navigationType: 'push' | 'replace' | 'traverse',
) {
  if (sentryDsn) {
    const suffixStart = url.search(/[?#]/)
    const safeUrl = suffixStart < 0 ? url : url.slice(0, suffixStart)
    Sentry.captureRouterTransitionStart(safeUrl, navigationType)
  }
}
