import { Wordmark } from '@/components/brand/Wordmark'
import { copy } from '@/lib/copy'

export default function Maintenance() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-8 py-16">
      <div className="flex w-full max-w-[42.5rem] flex-col items-center gap-7 bg-card text-center sm:gap-9">
        <Wordmark className="text-4xl sm:text-5xl" variant="stacked" />
        <h1 className="w-full font-serif text-4xl leading-[2.625rem] font-medium tracking-[-0.0125em] text-balance sm:text-5xl sm:leading-[3.25rem]">
          {copy.system.maintenance}
        </h1>
      </div>
    </main>
  )
}
