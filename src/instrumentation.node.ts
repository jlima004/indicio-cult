// `register` aguarda este bootstrap antes de aceitar requests. Importar
// `@/lib/env` aqui valida as variáveis exclusivas do servidor sem levar APIs do
// Node ao bundle Edge (SPEC-foundation §10, critério 4).
export async function registerNode() {
  let serverEnv: typeof import('@/lib/env').env
  try {
    serverEnv = (await import('@/lib/env')).env
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    // Rejeitar a Promise não basta: o handler do Next pode manter o processo
    // vivo sem servir. O supervisor precisa observar uma saída não zero.
    process.exit(1)
  }

  if (serverEnv.SENTRY_DSN) {
    const { initServerSentry } = await import('../sentry.server.config')
    initServerSentry({
      dsn: serverEnv.SENTRY_DSN,
      release: serverEnv.APP_VERSION,
      environment: serverEnv.NODE_ENV === 'production' ? 'production' : 'development',
    })
  }
}
