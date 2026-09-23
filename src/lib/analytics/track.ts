import { isDevelopment } from '@/lib/env/runtime'

export type AnalyticsPayload = {
  view_item: { itemId: string }
  add_to_cart: { itemId: string; quantity: number }
  begin_checkout: { currency: 'BRL'; value: number }
  purchase: { currency: 'BRL'; value: number }
  sign_up: Record<string, never>
  newsletter_subscribe: Record<string, never>
  exchange_requested: { itemId: string }
}

export type AnalyticsEvent = keyof AnalyticsPayload

export function track<E extends AnalyticsEvent>(event: E, payload: AnalyticsPayload[E]): void {
  void payload

  if (isDevelopment()) {
    console.log(`analytics: ${event}`)
  }
}
