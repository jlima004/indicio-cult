'use client'

import { Symbol } from '@/components/brand/Symbol'
import { copy } from '@/lib/copy'

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-8 py-16">
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
  )
}
