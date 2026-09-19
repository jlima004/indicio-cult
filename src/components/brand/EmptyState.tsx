import type { ComponentPropsWithoutRef } from 'react'

import { Symbol } from '@/components/brand/Symbol'
import { copy } from '@/lib/copy'

type EmptyStateProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  message?: string
}

export function EmptyState({ className, message = copy.system.empty, ...props }: EmptyStateProps) {
  return (
    <div
      {...props}
      className={`flex flex-col items-center gap-3 text-center ${className ?? ''}`}
      role="status"
    >
      <Symbol className="size-6 text-accent" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}
