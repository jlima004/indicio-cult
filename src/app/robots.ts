import type { MetadataRoute } from 'next'

import { publicEnv } from '@/lib/env/public'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: new URL('/sitemap.xml', publicEnv.NEXT_PUBLIC_SITE_URL).toString(),
  }
}
