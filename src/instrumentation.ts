// `register` roda uma vez por instância do servidor Next, antes do primeiro
// request. Importar `@/lib/env` aqui valida todas as variáveis de servidor na
// inicialização: se algo obrigatório faltar, o processo termina apontando a
// variável, em vez de quebrar tarde em runtime (SPEC-foundation §10, critério 4).
//
// As variáveis públicas (NEXT_PUBLIC_*) já são validadas no build, pelo import
// de `@/lib/env/public` no layout raiz — elas são inlinadas no bundle e, por
// isso, precisam existir na CI. As de servidor só existem no VPS.
//
// O Next registra um handler de unhandledRejection e mantém o processo vivo
// sem atender requests; `process.exit(1)` garante que o container caia e o
// `restart` do Compose (ou o operador) veja o erro.
//
// Sentry (server/edge) entra neste arquivo em T11.
export async function register() {
  try {
    await import('@/lib/env')
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
