import type { MetadataRoute } from 'next'

import { publicEnv } from '@/lib/env/public'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL('/', publicEnv.NEXT_PUBLIC_SITE_URL).toString(),
    },
  ]
}
