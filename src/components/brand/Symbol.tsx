import type { ComponentPropsWithoutRef } from 'react'

type SymbolProps = Omit<ComponentPropsWithoutRef<'svg'>, 'children'>

export function Symbol({ className, 'aria-label': ariaLabel, ...props }: SymbolProps) {
  const isDecorative = !ariaLabel

  return (
    <svg
      {...props}
      aria-hidden={isDecorative ? true : undefined}
      aria-label={ariaLabel}
      className={className}
      fill="none"
      focusable="false"
      height="24"
      role={isDecorative ? undefined : 'img'}
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 3H21V21H3V8" />
      <path d="M3 3L8 8" />
    </svg>
  )
}
