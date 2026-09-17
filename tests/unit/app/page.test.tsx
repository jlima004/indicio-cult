import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Home from '@/app/page'

describe('Home (placeholder)', () => {
  it('renderiza um único h1 com o nome da marca', () => {
    render(<Home />)

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('indicio cult')
  })
})
