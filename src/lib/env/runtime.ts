// Mantém a leitura de NODE_ENV disponível ao cliente sem carregar a validação
// das demais variáveis públicas ou o módulo server-only.
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}
