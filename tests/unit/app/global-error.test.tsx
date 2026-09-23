import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import GlobalError from '@/app/global-error'
import { copy } from '@/lib/copy'

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureException }))

vi.mock('next/font/google', () => ({
  Cormorant_Garamond: () => ({ variable: 'font-cormorant' }),
  Inter: () => ({ variable: 'font-inter' }),
}))

describe('Global Error', () => {
  it('reporta uma vez por erro, mesmo após rerender, e reporta um novo erro', () => {
    captureException.mockClear()
    const first = new Error('primeira falha global')
    const second = new Error('segunda falha global')
    const reset = vi.fn()
    const view = render(<GlobalError error={first} reset={reset} />, {
      container: document,
    })

    expect(captureException).toHaveBeenCalledExactlyOnceWith(first)
    view.rerender(<GlobalError error={first} reset={reset} />)
    expect(captureException).toHaveBeenCalledTimes(1)
    view.rerender(<GlobalError error={second} reset={reset} />)
    expect(captureException).toHaveBeenNthCalledWith(2, second)
  })

  it('é autossuficiente em html/body, usa a copy canônica e permite retry por reset', () => {
    const reset = vi.fn()
    render(<GlobalError error={new Error('falha global de teste')} reset={reset} />, {
      container: document,
    })

    expect(document.documentElement).toHaveAttribute('lang', 'pt-BR')
    expect(document.body).toHaveClass('bg-bg', 'text-fg')

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(screen.getByText(copy.system.error)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: copy.system.retry }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
