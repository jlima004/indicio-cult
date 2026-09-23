import type { Metadata } from 'next'

import { Wordmark } from '@/components/brand/Wordmark'
import { publicEnv } from '@/lib/env/public'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Indicio Cult',
    title: 'Indicio Cult',
    description:
      'Camisetas autorais com presença editorial. Cinema, literatura e artes plásticas aparecem como linguagem, ritmo e atmosfera.',
    url: new URL('/', publicEnv.NEXT_PUBLIC_SITE_URL).toString(),
    images: [
      {
        url: '/images/og/indicio-cult.png',
        alt: 'Logo Indicio Cult',
      },
    ],
  },
}

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-6 py-16 text-center">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8">
        <Wordmark className="text-4xl sm:text-5xl" variant="stacked" />
        <h1 className="font-serif text-4xl leading-[2.625rem] font-medium tracking-[-0.0125em] text-balance sm:text-5xl sm:leading-[3.25rem]">
          Arte para quem reconhece o indício.
        </h1>
      </div>
    </main>
  )
}
