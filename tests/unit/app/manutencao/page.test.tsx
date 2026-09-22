import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Maintenance from '@/app/manutencao/page'
import { copy } from '@/lib/copy'

describe('Manutenção', () => {
  it('renderiza a copy canônica em um único h1 sem inventar informação operacional', () => {
    render(<Maintenance />)

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent(copy.system.maintenance)

    const main = screen.getByRole('main')
    expect(main).not.toHaveTextContent(/\b(?:ETA|countdown|503|Retry-After)\b/i)
  })
})
