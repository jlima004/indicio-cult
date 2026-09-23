export type ProxyAction = 'continue' | 'maintenance' | 'redirect'

type ProxyDecisionInput = {
  pathname: string
  maintenanceMode: boolean
  hasVerifiedClaims: boolean
}

export function isHealthPath(pathname: string): boolean {
  return pathname === '/api/health'
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
  if (maintenanceMode && !isHealthPath(pathname)) return 'maintenance'
  if (isProtectedPath(pathname) && !hasVerifiedClaims) return 'redirect'
  return 'continue'
}
