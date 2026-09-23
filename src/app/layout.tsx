import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { Suspense } from 'react'

import { publicEnv } from '@/lib/env/public'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
})

const cormorant = Cormorant_Garamond({
  weight: ['400', '500', '600'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-cormorant',
})

// Ler `publicEnv` aqui valida as variáveis NEXT_PUBLIC_* no build (o layout é
// pré-renderizado).
const siteDescription =
  'Camisetas autorais com presença editorial. Cinema, literatura e artes plásticas aparecem como linguagem, ritmo e atmosfera.'

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: 'Indicio Cult',
    template: '%s | Indicio Cult',
  },
  description: siteDescription,
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Indicio Cult',
    title: 'Indicio Cult',
    description: siteDescription,
    images: [
      {
        url: '/images/og/indicio-cult.png',
        alt: 'Logo Indicio Cult',
      },
    ],
  },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  )
}
