import { render, screen } from '@testing-library/react'
import { renderToPipeableStream } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { isDevelopment } from '@/lib/env/runtime'

vi.mock('@/lib/env/public', () => ({
  publicEnv: { NEXT_PUBLIC_SITE_URL: 'https://indiciocult.com.br' },
}))
vi.mock('@/lib/env/runtime', () => ({ isDevelopment: vi.fn() }))

import Home from '@/app/(vitrine)/page'

describe('Home (placeholder da Foundation)', () => {
  it('renderiza o Wordmark empilhado e a assinatura da marca em um único h1', () => {
    render(<Home />)

    expect(screen.getByRole('img', { name: 'Indicio Cult' })).toHaveAttribute(
      'data-variant',
      'stacked',
    )

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent(/^Arte para quem reconhece o indício\.$/)
  })

  it('lança erro controlado em development com ?boom=1', async () => {
    vi.mocked(isDevelopment).mockReturnValue(true)
    const errors: unknown[] = []
    await new Promise<void>((resolve) => {
      renderToPipeableStream(<Home searchParams={Promise.resolve({ boom: '1' })} />, {
        onError: (error) => {
          errors.push(error)
        },
        onAllReady: resolve,
      })
    })

    expect(errors).toEqual([expect.objectContaining({ message: 'T11 Sentry test error' })])
  })

  it('preserva a Home em production mesmo com ?boom=1', async () => {
    vi.mocked(isDevelopment).mockReturnValue(false)
    const errors: unknown[] = []
    await new Promise<void>((resolve) => {
      renderToPipeableStream(<Home searchParams={Promise.resolve({ boom: '1' })} />, {
        onError: (error) => {
          errors.push(error)
        },
        onAllReady: resolve,
      })
    })

    expect(errors).toEqual([])
  })
})
