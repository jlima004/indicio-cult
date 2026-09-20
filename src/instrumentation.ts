export async function register() {
  // O Next executa este arquivo nos runtimes Node e Edge. O import condicional
  // impede que APIs exclusivas do Node entrem no bundle Edge.
  // https://nextjs.org/docs/app/guides/instrumentation#importing-runtime-specific-code
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerNode } = await import('./instrumentation.node')
    await registerNode()
  }
}
