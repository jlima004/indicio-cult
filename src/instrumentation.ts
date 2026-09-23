export async function register() {
  // O Next executa este arquivo nos runtimes Node e Edge. O import condicional
  // impede que APIs exclusivas do Node entrem no bundle Edge.
  // https://nextjs.org/docs/app/guides/instrumentation#importing-runtime-specific-code
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerNode } = await import('./instrumentation.node')
    await registerNode()
  }
}

// Next 16 captura erros de Server Components pelo hook de instrumentação.
// O bootstrap já validou o ambiente; sem DSN não carregamos o transporte.
export const onRequestError: import('next').Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { env } = await import('@/lib/env')
  if (!env.SENTRY_DSN) return
  const { captureRequestError } = await import('@sentry/nextjs')
  // O SDK copia request.path para um contexto próprio, fora do filtro
  // dataCollection.urlQueryParams. Remover query e fragmento aqui.
  captureRequestError(error, { ...request, path: request.path.replace(/[?#].*$/, '') }, context)
}
