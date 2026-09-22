import Image from 'next/image'
import Link from 'next/link'

import { copy } from '@/lib/copy'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[90rem] flex-1 items-center justify-center px-6 py-16 sm:px-16">
      <div className="grid w-full max-w-[70rem] items-center justify-center gap-8 lg:grid-cols-[minmax(0,32.5rem)_minmax(0,32.5rem)] lg:gap-20">
        <Image
          alt=""
          className="mx-auto h-auto w-[16.25rem] max-w-full lg:w-full"
          height={420}
          src="/images/system/not-found-artwork.svg"
          width={520}
        />

        <section className="flex min-w-0 flex-col items-start gap-6">
          <h1 className="max-w-[13ch] font-serif text-4xl leading-[2.625rem] font-medium tracking-[-0.0125em] text-balance lg:text-5xl lg:leading-[3.25rem]">
            {copy.system.notFound}
          </h1>
          <Link
            className="flex min-h-12 w-full items-center justify-between gap-3 text-xs font-medium tracking-[0.15em] uppercase outline-none focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg sm:w-[13.75rem]"
            href="/"
          >
            {copy.system.backHome}
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </main>
  )
}
