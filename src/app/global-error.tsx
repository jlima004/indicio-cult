'use client'

import * as Sentry from '@sentry/nextjs'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { useEffect, useRef } from 'react'

import { Symbol } from '@/components/brand/Symbol'
import { copy } from '@/lib/copy'
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

type GlobalErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const reportedError = useRef<Error | null>(null)

  useEffect(() => {
    if (reportedError.current !== error) {
      reportedError.current = error
      Sentry.captureException(error)
    }
  }, [error])

  return (
    <html lang="pt-BR" className={`${inter.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-fg">
        <main className="flex min-h-dvh items-center justify-center px-8 py-16">
          <div className="flex w-full max-w-[35rem] flex-col items-center gap-6 bg-card text-center sm:gap-7">
            <Symbol className="size-8 text-fg sm:size-12" />
            <h1 className="w-full font-serif text-4xl leading-[2.625rem] font-medium tracking-[-0.0125em] text-balance sm:text-5xl sm:leading-[3.25rem]">
              {copy.system.error}
            </h1>
            <button
              className="min-h-12 bg-inverse-bg px-6 text-xs font-medium tracking-[0.05em] text-inverse-fg uppercase outline-none focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg"
              onClick={reset}
              type="button"
            >
              {copy.system.retry}
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
