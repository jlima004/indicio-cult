import type { ComponentPropsWithoutRef } from 'react'

import { Symbol } from '@/components/brand/Symbol'

type WordmarkProps = Omit<ComponentPropsWithoutRef<'span'>, 'aria-label' | 'children'> & {
  variant?: 'stacked' | 'horizontal'
}

export function Wordmark({ className, variant = 'stacked', ...props }: WordmarkProps) {
  const direction =
    variant === 'stacked' ? 'flex-col items-start gap-1' : 'flex-row items-center gap-2'

  return (
    <span
      {...props}
      aria-label="Indicio Cult"
      className={`inline-flex ${direction} font-sans text-fg font-bold leading-none tracking-tighter ${className ?? ''}`}
      data-variant={variant}
      role="img"
    >
      <span aria-hidden="true">indicio</span>
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        <Symbol className="size-[0.72em] shrink-0" />
        cult
      </span>
    </span>
  )
}
