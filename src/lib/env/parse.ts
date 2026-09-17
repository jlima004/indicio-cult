import type { z } from 'zod'

/**
 * Valida um conjunto de variáveis contra o schema e falha rápido, listando
 * cada variável inválida pelo nome. Strings vazias contam como ausentes, para
 * que `CHAVE=` no `.env` não quebre validações de URL em variáveis opcionais.
 */
export function parseEnv<Schema extends z.ZodObject>(
  schema: Schema,
  values: Record<string, string | undefined>,
): z.output<Schema> {
  const normalized = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? undefined : value]),
  )

  const result = schema.safeParse(normalized)
  if (result.success) {
    return result.data
  }

  const details = result.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
    .join('\n')

  throw new Error(`Variáveis de ambiente inválidas:\n${details}`)
}
