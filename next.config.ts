import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'

import { buildAppVersion } from './src/lib/env/build'

const nextConfig: NextConfig = {
  // Build autocontido para a imagem Docker (deploy/Dockerfile copia .next/standalone).
  output: 'standalone',
  // Cache Components: `use cache` + cacheTag/revalidateTag (SPEC-foundation §2, amendment ao ADR-001).
  cacheComponents: true,
  // O release público é derivado de APP_VERSION durante o build.
  env: { NEXT_PUBLIC_APP_VERSION: buildAppVersion },
  // O SDK carrega este hook dinamicamente; o file tracing não o detecta.
  outputFileTracingIncludes: {
    '/*': ['./node_modules/@sentry/server-runtime-injection/build/esm/**/*'],
  },
}

export default withSentryConfig(nextConfig, {
  sourcemaps: { disable: true },
  telemetry: false,
  release: { name: buildAppVersion, create: false },
})
