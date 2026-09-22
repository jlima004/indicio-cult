import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ErrorPage from '@/app/error'
import { copy } from '@/lib/copy'

describe('Error boundary da aplicação', () => {
  it('renderiza a copy canônica e executa reset exatamente uma vez ao tentar novamente', () => {
    const reset = vi.fn()

    render(<ErrorPage error={new Error('falha de teste')} reset={reset} />)

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(screen.getByText(copy.system.error)).toBeInTheDocument()

    const retry = screen.getByRole('button', { name: copy.system.retry })
    fireEvent.click(retry)
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
