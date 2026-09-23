import { Wordmark } from '@/components/brand/Wordmark'

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
