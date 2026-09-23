import { describe, expect, it, vi } from 'vitest'

vi.mock('next/font/google', () => ({
  Cormorant_Garamond: () => ({ variable: 'font-cormorant' }),
  Inter: () => ({ variable: 'font-inter' }),
}))

vi.mock('@/lib/env/public', () => ({
  publicEnv: { NEXT_PUBLIC_SITE_URL: 'https://indiciocult.com.br' },
}))

import { metadata as rootMetadata } from '@/app/layout'
import { metadata as homeMetadata } from '@/app/(vitrine)/page'

describe('Metadata T10', () => {
  it('define canonical somente na Home, sem herança pela página de manutenção', () => {
    expect(rootMetadata.alternates?.canonical).toBeUndefined()
    expect(homeMetadata.alternates?.canonical).toBe('/')
    expect(new URL('/', rootMetadata.metadataBase as URL).href).toBe('https://indiciocult.com.br/')
  })

  it('mantém todos os campos Open Graph da Home e sua URL absoluta', () => {
    expect(homeMetadata.openGraph).toMatchObject({
      type: 'website',
      locale: 'pt_BR',
      siteName: 'Indicio Cult',
      title: 'Indicio Cult',
      description: rootMetadata.description,
      url: 'https://indiciocult.com.br/',
      images: [{ url: '/images/og/indicio-cult.png', alt: 'Logo Indicio Cult' }],
    })
  })
})
