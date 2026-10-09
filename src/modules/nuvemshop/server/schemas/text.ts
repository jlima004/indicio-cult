import 'server-only'

import type { LocalizedText } from '../types'

const LOCALE = /^[a-z]{2,3}(?:[_-][A-Za-z0-9]+)?$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function readLocalized(value: unknown, required: boolean): LocalizedText | null | undefined {
  if (value === undefined || value === null) return required ? undefined : null
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const entries = Object.entries(value)
  if (entries.length > 16) return undefined
  const localized: Record<string, string> = {}
  for (const [key, item] of entries) {
    if (!LOCALE.test(key) || typeof item !== 'string' || item.length > 100_000) return undefined
    localized[key] = item
  }
  if (required && !Object.values(localized).some((item) => item.trim().length > 0)) return undefined
  return localized
}

export function readHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048 || /\s/.test(value)) {
    return undefined
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
  if (url.username !== '' || url.password !== '') return undefined
  return value
}

export function readContactEmail(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length > 320 || !EMAIL.test(value)) return null
  return value
}

export function readBoundedString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || value.length > max) return undefined
  return value
}
