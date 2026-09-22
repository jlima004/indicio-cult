import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import NotFound from '@/app/not-found'
import { copy } from '@/lib/copy'

describe('Not Found', () => {
  it('renderiza a copy canônica, um único h1 e um link acessível para a Home', () => {
    render(<NotFound />)

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(screen.getByText(copy.system.notFound)).toBeInTheDocument()

    const backHome = screen.getByRole('link', { name: copy.system.backHome })
    expect(backHome).toHaveAttribute('href', '/')
  })
})
