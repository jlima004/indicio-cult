import 'server-only'

const MONEY = /^(?:0|[1-9]\d*)(?:\.\d+)?$/

export function readMoney(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 32 || !MONEY.test(value)) return undefined
  return value
}
