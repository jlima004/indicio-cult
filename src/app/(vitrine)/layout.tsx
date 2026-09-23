import type { ReactNode } from 'react'

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header aria-label="Cabeçalho da vitrine" />
      {children}
      <footer aria-label="Rodapé da vitrine" />
    </>
  )
}
