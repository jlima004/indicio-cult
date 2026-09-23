import * as Sentry from '@sentry/nextjs'

import { sentryDataCollection } from '@/lib/sentry/privacy'

let initialized = false

export function initServerSentry(config: {
  dsn: string
  release: string
  environment: 'development' | 'production'
}) {
  if (initialized) return

  Sentry.init({
    ...config,
    tracesSampleRate: 0.1,
    dataCollection: sentryDataCollection,
  })
  initialized = true
}
