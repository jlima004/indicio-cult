import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Home from '@/app/page'

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
})
