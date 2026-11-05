export type ProxyAction = 'continue' | 'maintenance' | 'redirect'

type ProxyDecisionInput = {
  pathname: string
  maintenanceMode: boolean
  hasVerifiedClaims: boolean
}

export function isHealthPath(pathname: string): boolean {
  return pathname === '/api/health'
}

export function isLivePath(pathname: string): boolean {
  return pathname === '/api/live'
}

const NUVEMSHOP_WEBHOOK_PATHS = new Set([
  '/api/webhooks/nuvemshop/events',
  '/api/webhooks/nuvemshop/store-redact',
  '/api/webhooks/nuvemshop/customers-redact',
  '/api/webhooks/nuvemshop/customers-data-request',
])

export function isNuvemshopWebhookPath(pathname: string): boolean {
  return NUVEMSHOP_WEBHOOK_PATHS.has(pathname)
}

export function isProtectedPath(pathname: string): boolean {
  return (
    pathname === '/conta' ||
    pathname.startsWith('/conta/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  )
}

export function decideProxyAction({
  pathname,
  maintenanceMode,
  hasVerifiedClaims,
}: ProxyDecisionInput): ProxyAction {
  if (
    maintenanceMode &&
    !isHealthPath(pathname) &&
    !isLivePath(pathname) &&
    !isNuvemshopWebhookPath(pathname)
  )
    return 'maintenance'
  if (isProtectedPath(pathname) && !hasVerifiedClaims) return 'redirect'
  return 'continue'
}
