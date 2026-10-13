import 'server-only'

import { z } from 'zod'

import { parseEnv } from './parse'

const secretSchema = z.string().refine((value) => value.trim().length > 0, {
  message: 'Segredo obrigatório e não vazio',
})

export const nuvemshopApiSchema = z.object({
  // Política local: decimal positivo em ASCII, preservando todos os dígitos.
  // Não converter para number: IDs podem exceder Number.MAX_SAFE_INTEGER.
  NUVEMSHOP_STORE_ID: z.string().refine((value) => !/[^0-9]/.test(value) && /[1-9]/.test(value), {
    message: 'ID deve ser uma string decimal positiva',
  }),
  NUVEMSHOP_ACCESS_TOKEN: secretSchema,
})

export const nuvemshopHmacSchema = z.object({
  NUVEMSHOP_CLIENT_SECRET: secretSchema,
})

// Não existe convenção de sentinels no Foundation. Esta política local rejeita
// placeholders óbvios em produção; não presume formato de token/app secret.
// fake/sample só são sentinels nas formas exatas abaixo, sem busca por substring.
const placeholder =
  /^(?:change[-_ ]?me|replace(?:[-_ ].*)?|placeholder(?:[-_ ].*)?|your[-_ ].*|(?:test|dummy|synthetic|example|ci)(?:[-_ ].*)?|(?:fake|sample)(?:-(?:token|secret))?|<.*>)$/i

// Property access, not the ambient `process` binding. Boundary proofs typecheck
// this module with `types: []`, where that binding is intentionally absent.
function readProcessEnv(): Record<string, string | undefined> {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } }
  return runtime.process?.env ?? {}
}

function assertProductionSecret(key: string, value: string): void {
  if (readProcessEnv().NODE_ENV === 'production' && placeholder.test(value.trim())) {
    throw new Error(`Variável de ambiente inválida: ${key}: placeholder proibido em produção`)
  }
}

// Leitura e validação por operação. Importar este módulo não exige credenciais.
// O transporte futuro deve obter esta configuração antes de qualquer request.
export function getNuvemshopApiConfig() {
  const config = parseEnv(nuvemshopApiSchema, readProcessEnv())
  assertProductionSecret('NUVEMSHOP_ACCESS_TOKEN', config.NUVEMSHOP_ACCESS_TOKEN)
  return {
    storeId: config.NUVEMSHOP_STORE_ID,
    accessToken: config.NUVEMSHOP_ACCESS_TOKEN,
    apiVersion: '2025-03' as const,
  }
}

// Somente o app secret current; HR-03 ainda governa qualquer rotação futura.
// Isto fornece material ao verifier futuro, sem implementar HMAC ou ACK.
export function getNuvemshopHmacConfig() {
  const config = parseEnv(nuvemshopHmacSchema, readProcessEnv())
  assertProductionSecret('NUVEMSHOP_CLIENT_SECRET', config.NUVEMSHOP_CLIENT_SECRET)
  return { clientSecret: config.NUVEMSHOP_CLIENT_SECRET }
}
